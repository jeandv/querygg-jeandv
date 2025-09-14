import * as React from "react"

const queryContext = React.createContext([
  {},
  () => {}
])

export function QueryProvider({ children }) {
  const tuple = React.useState({})

  return (
    <queryContext.Provider value={tuple}>
      {children}
    </queryContext.Provider>
  )
}

export default function useQuery(url) {
  const [state, setState] = React.useContext(queryContext)

  React.useEffect(() => {
    const update = (newState) => setState((prevState) => ({ 
      ...prevState, [url]: { ...prevState[url], ...newState }
    }))

    let ignore = false

    const handleFetch = async () => {
      update({ data: null, isLoading: true, error: null })

      try {
        const res = await fetch(url)

        if (ignore) {
          return 
        }

        if (res.ok === false) {
          throw new Error(`A network error occurred.`)
        }

        const data = await res.json()

        update({ data, isLoading: false, error: null })
      } catch (e) {
        update({ error: e.message, isLoading: false, data: null })
      }
    }

    handleFetch()
  }, [url])

  return state[url] || { data: null, isLoading: true, error: null }
}