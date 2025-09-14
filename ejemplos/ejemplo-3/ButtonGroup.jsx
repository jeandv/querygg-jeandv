export default function ButtonGroup({ handleSetId }) {
  const handlePrevious = () => handleSetId((id) => id > 1 ? id - 1 : id)
  const handleNext = () => handleSetId((id) => id + 1)

  return (
    <div className="button-group">
      <button name="previous" onClick={handlePrevious}>
        ←
      </button>
      <button name="next" onClick={handleNext}>
        →
      </button>
    </div>
  )
}