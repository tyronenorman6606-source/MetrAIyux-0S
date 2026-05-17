export default function Meter({ value = 0, label = '', detail = '' }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="meter-block">
      <div className="meter-head">
        <span>{label}</span>
        <strong>{safeValue}%</strong>
      </div>
      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${safeValue}%` }} />
      </div>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}
