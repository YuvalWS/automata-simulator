import './MobileWarning.css';

export function MobileWarning() {
  return (
    <div className="mobile-warning">
      <span className="mobile-warning-icon">{'\uD83D\uDDA5'}</span>
      <h2>Desktop Only</h2>
      <p>
        This app is designed for desktop browsers. Please use a device with a
        larger screen for the best experience.
      </p>
    </div>
  );
}
