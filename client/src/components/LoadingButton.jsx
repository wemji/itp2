export default function LoadingButton({
  loading = false,
  loadingLabel = 'Please wait…',
  disabled = false,
  children,
  ...props
}) {
  return (
    <button {...props} disabled={disabled || loading} aria-busy={loading}>
      {loading ? (
        <>
          <span className="button-spinner" aria-hidden="true" />
          <span>{loadingLabel}</span>
        </>
      ) : children}
    </button>
  );
}
