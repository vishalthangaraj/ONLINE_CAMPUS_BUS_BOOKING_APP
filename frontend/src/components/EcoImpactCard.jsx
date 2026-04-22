import React from 'react';
import { Leaf, TrendingDown, Target } from 'lucide-react';

const EcoImpactCard = ({ bookingCount = 0 }) => {
  // Constants for CO2 calculation
  // Avg car emission: 140g/km | Avg student share in bus: 20g/km
  // Avg trip distance: 30km
  const SAVING_PER_TRIP = (140 - 20) * 30; // 3600g = 3.6kg
  const totalCo2Saved = (bookingCount * SAVING_PER_TRIP) / 1000; // in kg
  const treesEquivalent = (totalCo2Saved / 20).toFixed(2); // Avg tree absorbs ~20kg/year

  return (
    <div className="eco-impact-card">
      <style>{`
        .eco-impact-card {
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
          border: 1px solid #a7f3d0;
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .eco-header {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #065f46;
        }
        .eco-title {
          font-size: 1.1rem;
          font-weight: 700;
          margin: 0;
        }
        .eco-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .eco-stat-item {
          background: white;
          padding: 16px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          border: 1px solid rgba(16, 185, 129, 0.1);
        }
        .eco-stat-label {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }
        .eco-stat-value {
          font-size: 1.25rem;
          font-weight: 800;
          color: #059669;
        }
        .eco-footer {
          font-size: 0.875rem;
          color: #059669;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
          padding-top: 12px;
          border-top: 1px solid rgba(16, 185, 129, 0.1);
        }
      `}</style>
      
      <div className="eco-header">
        <Leaf size={24} fill="#10b981" />
        <h3 className="eco-title">Green Campus Impact</h3>
      </div>

      <div className="eco-stats-grid">
        <div className="eco-stat-item">
          <div className="eco-stat-label">CO₂ Saved</div>
          <div className="eco-stat-value">{totalCo2Saved.toFixed(1)} kg</div>
        </div>
        <div className="eco-stat-item">
          <div className="eco-stat-label">Trees Offset</div>
          <div className="eco-stat-value">{treesEquivalent}</div>
        </div>
      </div>

      <div className="eco-footer">
        <TrendingDown size={16} />
        <span>Reducing your carbon footprint by choosing public transport!</span>
      </div>
    </div>
  );
};

export default EcoImpactCard;
