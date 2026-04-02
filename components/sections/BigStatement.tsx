export function BigStatement({ statement, attribution }: { statement: string; attribution?: string }) {
  return (
    <div
      className="my-10 mx-auto rounded-xl relative overflow-hidden"
      style={{
        maxWidth: '720px',
        backgroundColor: '#FAEEDA',
        padding: '1.5rem 2rem 1.5rem 2.5rem',
      }}
    >
      {/* Decorative quote mark */}
      <svg
        width="32"
        height="24"
        viewBox="0 0 32 24"
        fill="none"
        className="absolute"
        style={{ top: '1rem', left: '1rem', opacity: 0.3 }}
        aria-hidden="true"
      >
        <path
          d="M0 24V14.4C0 10.4 0.8 7.2 2.4 4.8C4.08 2.4 6.56 0.64 9.84 0L11.2 3.36C9.28 3.84 7.76 4.8 6.64 6.24C5.6 7.68 5.04 9.36 4.96 11.28H11.2V24H0ZM20.8 24V14.4C20.8 10.4 21.6 7.2 23.2 4.8C24.88 2.4 27.36 0.64 30.64 0L32 3.36C30.08 3.84 28.56 4.8 27.44 6.24C26.4 7.68 25.84 9.36 25.76 11.28H32V24H20.8Z"
          fill="#BA7517"
        />
      </svg>

      <p
        className="text-lg font-medium leading-relaxed"
        style={{
          color: '#633806',
          paddingLeft: '1.5rem',
        }}
      >
        {statement}
      </p>

      {attribution && (
        <p
          className="mt-2 text-xs"
          style={{
            color: '#854F0B',
            paddingLeft: '1.5rem',
          }}
        >
          &mdash; {attribution}
        </p>
      )}
    </div>
  )
}

export default BigStatement
