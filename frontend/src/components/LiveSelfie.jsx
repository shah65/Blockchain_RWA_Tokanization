// ============================================================================
// src/components/LiveSelfie.jsx
// Real-time selfie capture with liveness challenges.
// Uses @vladmandic/face-api for face + landmark detection.
// ============================================================================
import { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "@vladmandic/face-api";

const MODEL_URL = "/models/face-api";

const CHALLENGES = [
  {
    id: "center",
    label: "Center your face in the oval",
    hint: "Look straight at the camera",
    validate: ({ yaw, pitch }, size) =>
      Math.abs(yaw) < 0.18 && pitch > 0.30 && pitch < 0.60 && size > 0.25,
  },
  {
    id: "blink",
    label: "Blink your eyes",
    hint: "Slow, natural blink",
    validate: ({ ear }) => ear < 0.20,
  },
  {
    id: "left",
    label: "Slowly turn your head LEFT",
    hint: "Then back to center",
    validate: ({ yaw }) => yaw > 0.28,
  },
  {
    id: "right",
    label: "Slowly turn your head RIGHT",
    hint: "Then back to center",
    validate: ({ yaw }) => yaw < -0.28,
  },
  {
    id: "up",
    label: "Tilt your head UP",
    hint: "Chin slightly raised",
    validate: ({ pitch }) => pitch < 0.42,
  },
  {
    id: "final",
    label: "Look straight — capturing",
    hint: "Hold still",
    validate: ({ yaw, pitch }, size) =>
      Math.abs(yaw) < 0.15 && pitch > 0.35 && pitch < 0.55 && size > 0.30,
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
  const leftEye = L[36];
  const rightEye = L[45];
  const nose = L[30];
  const chin = L[8];
  const brow = L[27];

  const eyeMidX = (leftEye.x + rightEye.x) / 2;
  const eyeDist = Math.max(1, dist(leftEye, rightEye));
  const yaw = (nose.x - eyeMidX) / eyeDist;

  const eyeMidY = (leftEye.y + rightEye.y) / 2;
  const faceHeight = Math.max(1, dist(brow, chin));
  const pitch = (nose.y - eyeMidY) / faceHeight;

  return { yaw, pitch };
}

export default function LiveSelfie({ onCapture, onError }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const holdRef = useRef(0); // how many consecutive frames a challenge has held

  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [stageIdx, setStageIdx] = useState(0);
  const [progress, setProgress] = useState(0); // 0..1 progress inside current challenge
  const [frames, setFrames] = useState([]); // captured JPEG data URLs
  const [done, setDone] = useState(false);

  // ---- Load models once ----
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
        setError("Could not load face-detection models.");
        onError?.("models");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onError]);

  // ---- Start webcam once models are ready ----
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
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
        setError("Camera access denied or unavailable.");
        onError?.("camera");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(rafRef.current);
    };
  }, [ready, onError]);

  // ---- Detection loop ----
  const tick = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || done) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    try {
      const result = await faceapi
        .detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
        )
        .withFaceLandmarks();

      const challenge = CHALLENGES[stageIdx];

      if (result && challenge) {
        const box = result.detection.box;
        const videoArea = video.videoWidth * video.videoHeight;
        const size = (box.width * box.height) / videoArea;
        const ear = getEAR(result.landmarks);
        const pose = getPose(result.landmarks);

        const passed = challenge.validate({ ...pose, ear }, size);
        holdRef.current = passed ? holdRef.current + 1 : 0;
        const required = challenge.id === "blink" ? 1 : 6;
        const p = Math.min(1, holdRef.current / required);
        setProgress(p);

        if (p >= 1) {
          const snap = captureFrame(video);
          const nextFrames = [...frames, snap];
          setFrames(nextFrames);
          holdRef.current = 0;
          setProgress(0);

          if (stageIdx + 1 >= CHALLENGES.length) {
            setDone(true);
            onCapture({ finalFrame: snap, frames: nextFrames });
          } else {
            setStageIdx((i) => i + 1);
          }
        }
      } else {
        holdRef.current = 0;
        setProgress(0);
      }
    } catch (e) {
      // Detection errors on individual frames are non-fatal; just log
      console.warn("[LiveSelfie] detect error", e);
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [stageIdx, frames, done, onCapture]);

  useEffect(() => {
    if (!ready || error) return;
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready, error, tick]);

  // ---- Draw oval guide ----
  const captureFrame = (video) => {
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 640;
    const ctx = canvas.getContext("2d");

    // Cover-fit the video into a portrait frame, mirrored
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const scale = Math.max(canvas.width / vw, canvas.height / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    const dx = (canvas.width - dw) / 2;
    const dy = (canvas.height - dh) / 2;

    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1); // mirror to match what the user saw
    ctx.drawImage(video, dx, dy, dw, dh);
    ctx.restore();

    return canvas.toDataURL("image/jpeg", 0.85);
  };

  const challenge = CHALLENGES[stageIdx];

  // ---- UI ----
  if (error) {
    return (
      <div className="ls-error">
        <p>{error}</p>
        <p className="ls-error-hint">
          Make sure you've allowed camera access, and that the page is served
          over HTTPS or localhost.
        </p>
      </div>
    );
  }

  if (!ready) {
    return <div className="ls-loading">Loading face-detection models…</div>;
  }

  return (
    <div className="ls-wrap">
      <div className="ls-stage">
        <video
          ref={videoRef}
          className="ls-video"
          playsInline
          muted
          autoPlay
        />
        <div className="ls-oval" aria-hidden />
        {frames.length > 0 && (
          <div className="ls-thumbs">
            {frames.map((f, i) => (
              <img key={i} src={f} alt={`capture-${i}`} className="ls-thumb" />
            ))}
          </div>
        )}
      </div>

      <div className="ls-progress">
        <div className="ls-progress-track">
          <div
            className="ls-progress-fill"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      <div className="ls-challenge">
        <span className="ls-step">
          {stageIdx + 1} / {CHALLENGES.length}
        </span>
        <strong className="ls-label">{challenge?.label}</strong>
        <span className="ls-hint">{challenge?.hint}</span>
      </div>

      {/* Hidden canvas used for capture */}
      <canvas ref={canvasRef} className="ls-canvas" aria-hidden />
    </div>
  );
}