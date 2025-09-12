import * as React from "react"

export default function useQuery(url) {
  const [data, setData] = React.useState(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState(null)

  React.useEffect(() => {
    let ignore = false

    const handleFetch = async () => {
      setData(null)
      setIsLoading(true)
      setError(null)

      try {
        const res = await fetch(url)

        if (ignore) {
          return 
        }

        if (res.ok === false) {
          throw new Error(`A network error occurred.`)
        }

        const json = await res.json()

        setData(json)
        setIsLoading(false)
      } catch (e) {
        setError(e.message)
        setIsLoading(false)
      }
    }

    handleFetch()

    return () => {
      ignore = true
    }
  }, [url])

  return { data, isLoading, error }
}