export function BigStatement({ statement }: { statement: string }) {
  return (
    <div className="my-10 px-4 text-center">
      <p
        className="text-xl font-medium leading-relaxed italic mx-auto"
        style={{
          maxWidth: '640px',
          color: 'var(--text-primary, #1a1a1a)',
        }}
      >
        {statement}
      </p>
    </div>
  )
}

export default BigStatement
