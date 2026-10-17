export default function Toast({ message, type = 'error' }) { return message ? <div className={`toast ${type}`}>{message}</div> : null; }
