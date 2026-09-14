export default function Spinner({ label = "Loading..." }) {
  return (
    <div className="spinner-container" role="status" aria-live="polite">
      <div className="spinner" />
      <p>{label}</p>
    </div>
  );
}