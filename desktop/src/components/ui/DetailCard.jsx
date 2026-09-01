import "./DetailCard.css";

function DetailCard({ icon, title, children }) {
  return (
    <section className="detail-card">
      <div className="detail-card-header">
        <span className="detail-card-icon">{icon}</span>

        <h3>{title}</h3>
      </div>

      <div className="detail-card-body">
        {children}
      </div>
    </section>
  );
}

export default DetailCard;