import * as React from "react"
import PokemonCard from "./PokemonCard"
import ButtonGroup from "./ButtonGroup"

export default function App () {
  const [id, setId] = React.useState(1)
  const [pokemon, setPokemon] = React.useState(null)

  React.useEffect(() => {
    const handleFetchPokemon = async () => {
      setPokemon(null)

      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
      const json = await res.json()
      setPokemon(json)
    }

    handleFetchPokemon()
  }, [id])

  return (
    <>
      <PokemonCard data={pokemon}/>
      <ButtonGroup handleSetId={setId} />
    </>
  )
}