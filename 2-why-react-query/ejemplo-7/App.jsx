import * as React from "react"
import PokemonCard from "./PokemonCard"
import ButtonGroup from "./ButtonGroup"
import useQuery, { QueryProvider } from "./useQuery"

function App () {
  const [id, setId] = React.useState(1)
  const { data: pokemon, isLoading, error } = useQuery(`https://pokeapi.co/api/v2/pokemon/${id}`)

  return (
    <>
      <PokemonCard 
        isLoading={isLoading} 
        data={pokemon} 
        error={error}
      />
      <ButtonGroup handleSetId={setId} />
    </>
  )
}

export default function Root() {
  return (
    <QueryProvider>
      <App/>
    </QueryProvider>
  )
}