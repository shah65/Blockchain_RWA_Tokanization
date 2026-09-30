// ============================================================================
// src/components/LiveSelfie.jsx
// Front-facing capture is required; left/right are optional extras.
// ============================================================================
import { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "@vladmandic/face-api";

const MODEL_URL = "/models/face-api";

// ---------------------------------------------------------------------------
// 3 challenges.
//   required: true  → must be captured before the parent sees a result
//   required: false → optional; user can skip or capture at will
// ---------------------------------------------------------------------------
const CHALLENGES = [
  {
    id: "front",
    icon: "🧑",
    title: "Front-facing",
    hint: "Look straight at the camera, whole face inside the oval.",
    required: true,
    minProgressToCapture: 0.4,
    captureThreshold: 1.0,
    validate: ({ yawRatio, pitchRatio }, size) =>
      Math.abs(yawRatio - 1.0) < 0.25 &&
      pitchRatio > 0.25 && pitchRatio < 0.85 &&
      size > 0.08,
  },
  {
    id: "left",
    icon: "◀️",
    title: "Turn LEFT (optional)",
    hint: "Left ear toward the camera, then tap Capture. Or press Next to skip.",
    required: false,
    minProgressToCapture: 0.4,
    captureThreshold: 0.8,   // easier — user can hit Capture before auto-fire
    validate: ({ yawRatio }) => yawRatio > 1.25,
  },
  {
    id: "right",
    icon: "▶️",
    title: "Turn RIGHT (optional)",
    hint: "Right ear toward the camera, then tap Capture. Or press Finish.",
    required: false,
    minProgressToCapture: 0.4,
    captureThreshold: 0.8,
    validate: ({ yawRatio }) => yawRatio < 0.80,
  },
];

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function getEAR(landmarks) {
  const L = landmarks.positions;
  const ear = (pts) => {
    const v1 = dist(pts[1], pts[5]);
    const v2 = dist(pts[2], pts[4]);
    const h = Math.max(1, dist(pts[0], pts[3]));
    return (v1 + v2) / (2 * h);
  };
  const left = [36, 37, 38, 39, 40, 41].map((i) => L[i]);
  const right = [42, 43, 44, 45, 46, 47].map((i) => L[i]);
  return (ear(left) + ear(right)) / 2;
}

function getPose(landmarks) {
  const L = landmarks.positions;
  const leftEyeOuter = L[36];
  const rightEyeOuter = L[45];
  const nose = L[30];
  const chin = L[8];
  const brow = L[27];

  const dNoseToLeft = Math.max(1, dist(nose, leftEyeOuter));
  const dNoseToRight = Math.max(1, dist(nose, rightEyeOuter));
  const yawRatio = dNoseToRight / dNoseToLeft;

  const eyeMidY = (leftEyeOuter.y + rightEyeOuter.y) / 2;
  const faceSpan = Math.max(1, dist(brow, chin));
  const pitchRatio = (nose.y - eyeMidY) / faceSpan;

  return { yawRatio, pitchRatio };
}

export default function LiveSelfie({ onCapture, onError }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const holdRef = useRef(0);
  const busyRef = useRef(false);
  const framesRef = useRef([]); // keep the latest frames for onCapture

  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [stageIdx, setStageIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [frames, setFrames] = useState([]);
  const [done, setDone] = useState(false);
  const [poseReady, setPoseReady] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [flash, setFlash] = useState(false);

  const challenge = CHALLENGES[stageIdx];
  const frontCaptured = frames.length > 0;
  const isLastStage = stageIdx === CHALLENGES.length - 1;

  // Keep framesRef in sync so onCapture always sees the newest array
  useEffect(() => {
    framesRef.current = frames;
  }, [frames]);

  // ---- Load models -----------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        ]);
        if (!cancelled) setReady(true);
      } catch (e) {
        console.error("[LiveSelfie] model load failed", e);
        if (!cancelled) {
          setError("Could not load face-detection models.");
          onError?.("models");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onError]);

  // ---- Start webcam ----------------------------------------------------
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 720 },
            height: { ideal: 960 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e) {
        console.error("[LiveSelfie] getUserMedia failed", e);
        if (!cancelled) {
          setError("Camera access denied or unavailable.");
          onError?.("camera");
        }
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(rafRef.current);
    };
  }, [ready, onError]);

  // ---- Reset per-stage state ------------------------------------------
  useEffect(() => {
    holdRef.current = 0;
    busyRef.current = false;
    setProgress(0);
    setPoseReady(false);
    setShowFallback(false);
    const t = setTimeout(() => setShowFallback(true), 15_000);
    return () => clearTimeout(t);
  }, [stageIdx]);

  // ---- Frame capture ---------------------------------------------------
  const captureFrame = useCallback((video) => {
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 640;
    const ctx = canvas.getContext("2d");

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const scale = Math.max(canvas.width / vw, canvas.height / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    const dx = (canvas.width - dw) / 2;
    const dy = (canvas.height - dh) / 2;

    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, dx, dy, dw, dh);
    ctx.restore();

    return canvas.toDataURL("image/jpeg", 0.85);
  }, []);

  // ---- Finish the flow: hand everything to the parent ------------------
  const finish = useCallback(
    (nextFrames) => {
      if (done) return;
      setDone(true);
      onCapture({
        finalFrame: nextFrames[nextFrames.length - 1],
        frames: nextFrames,
      });
    },
    [done, onCapture]
  );

  // ---- Commit a captured frame and advance (or finish) -----------------
  const commitFrame = useCallback(
    (snap) => {
      if (busyRef.current) return;
      busyRef.current = true;

      const nextFrames = [...framesRef.current, snap];
      setFrames(nextFrames);
      setFlash(true);
      setTimeout(() => setFlash(false), 180);

      // Last stage → finish. Otherwise advance.
      if (stageIdx + 1 >= CHALLENGES.length) {
        setTimeout(() => finish(nextFrames), 240);
      } else {
        setTimeout(() => {
          setStageIdx((i) => i + 1);
          busyRef.current = false;
        }, 240);
      }
    },
    [stageIdx, finish]
  );

  // ---- Detection loop --------------------------------------------------
  const tick = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || done || busyRef.current) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    try {
      const result = await faceapi
        .detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 416,
            scoreThreshold: 0.5,
          })
        )
        .withFaceLandmarks();

      const current = CHALLENGES[stageIdx];
      if (!current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (result) {
        const box = result.detection.box;
        const videoArea = video.videoWidth * video.videoHeight;
        const size = (box.width * box.height) / videoArea;
        const ear = getEAR(result.landmarks);
        const pose = getPose(result.landmarks);

        const passed = current.validate({ ...pose, ear }, size);
        holdRef.current = passed ? holdRef.current + 1 : 0;
        // Required steps need many confirmations; optional steps auto-fire sooner
        const requiredFrames = current.required ? 8 : 5;
        const p = Math.min(1, holdRef.current / requiredFrames);
        setProgress(p);
        setPoseReady(p >= current.minProgressToCapture);

        // Auto-capture when progress hits the threshold
        if (p >= current.captureThreshold) {
          const snap = captureFrame(video);
          commitFrame(snap);
        }
      } else {
        holdRef.current = 0;
        setProgress(0);
        setPoseReady(false);
      }
    } catch (e) {
      console.warn("[LiveSelfie] detect error", e);
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [stageIdx, done, captureFrame, commitFrame]);

  useEffect(() => {
    if (!ready || error) return;
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready, error, tick]);

  // ---- Manual capture (button) ----------------------------------------
  const handleCapture = useCallback(() => {
    if (!videoRef.current || done || busyRef.current) return;
    if (!poseReady) return;
    const snap = captureFrame(videoRef.current);
    commitFrame(snap);
  }, [poseReady, done, captureFrame, commitFrame]);

  // ---- Skip optional step ---------------------------------------------
  const handleSkip = useCallback(() => {
    if (challenge?.required) return;      // can't skip required
    if (isLastStage) {
      finish(framesRef.current);
    } else {
      setStageIdx((i) => i + 1);
    }
  }, [challenge, isLastStage, finish]);

  // ---- Finish early (only after front is captured) ---------------------
  const handleFinishEarly = useCallback(() => {
    if (!frontCaptured) return;
    finish(framesRef.current);
  }, [frontCaptured, finish]);

  // ---- UI states -------------------------------------------------------
  if (error) {
    return (
      <div className="ls-error">
        <p>{error}</p>
        <p className="ls-error-hint">
          Allow camera access and make sure the page is served over HTTPS or
          localhost.
        </p>
      </div>
    );
  }

  if (!ready) {
    return <div className="ls-loading">Loading face-detection models…</div>;
  }

  return (
    <div className="ls-wrap">
      <div className="ls-topbar">
        <div className="ls-dots" aria-hidden>
          {CHALLENGES.map((c, i) => (
            <span
              key={c.id}
              className={
                i < stageIdx || (i === 0 && frontCaptured)
                  ? "ls-dot is-done"
                  : i === stageIdx
                    ? "ls-dot is-current"
                    : "ls-dot"
              }
              title={c.title}
            >
              {i < stageIdx || (i === 0 && frontCaptured) ? "✓" : c.icon}
            </span>
          ))}
        </div>
        <span className="ls-counter">
          {stageIdx + 1} / {CHALLENGES.length}
        </span>
      </div>

      <div className={`ls-stage ${flash ? "ls-flash" : ""}`}>
        <video
          ref={videoRef}
          className="ls-video"
          playsInline
          muted
          autoPlay
        />
        <div
          className={`ls-oval ${poseReady ? "ls-oval-active" : ""}`}
          aria-hidden
        />
        {flash && <div className="ls-flash-layer" aria-hidden />}
        {frames.length > 0 && (
          <div className="ls-thumbs">
            {frames.map((f, i) => (
              <img
                key={i}
                src={f}
                alt={`capture-${i}`}
                className="ls-thumb"
              />
            ))}
          </div>
        )}
      </div>

      <div className="ls-instruction">
        <span className="ls-instruction-icon">{challenge?.icon}</span>
        <div className="ls-instruction-text">
          <strong className="ls-instruction-title">{challenge?.title}</strong>
          <span className="ls-instruction-hint">{challenge?.hint}</span>
        </div>
        <div className="ls-progress-track">
          <div
            className="ls-progress-fill"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      <div className="ls-actions">
        <button
          type="button"
          className={`ls-capture-btn ${poseReady ? "is-ready" : "is-waiting"
            }`}
          disabled={!poseReady}
          onClick={handleCapture}
        >
          <span className="ls-capture-icon">📸</span>
          <span className="ls-capture-label">
            {poseReady ? "Capture now" : "Hold pose…"}
          </span>
        </button>

        {/* Optional steps show a Skip button */}
        {!challenge?.required && (
          <button
            type="button"
            className="ls-fallback-btn"
            onClick={handleSkip}
            title={isLastStage ? "Finish without this angle" : "Skip this angle"}
          >
            {isLastStage ? "Finish" : "Skip"}
          </button>
        )}
      </div>

      {/* If front is captured and we're on an optional step, offer early finish */}
      {frontCaptured && stageIdx > 0 && stageIdx < CHALLENGES.length - 1 && (
        <button
          type="button"
          className="ls-finish-early"
          onClick={handleFinishEarly}
        >
          Finish now with front only
        </button>
      )}

      <canvas ref={canvasRef} className="ls-canvas" aria-hidden />
    </div>
  );
} 