import "./DetailRow.css";

function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <span className="detail-label">
        {label}
      </span>

      <div className="detail-value">
        {value}
      </div>
    </div>
  );
}

export default DetailRow;