## Garbage Collection

La "salsa secreta" de React Query es su caché, y como cualquier salsa, no puedes confiar en ella a menos que tenga una fecha de caducidad.

La razón, en el caso de React Query, es que su caché se mantiene en la memoria, que es finita. Sin purgar la caché de vez en cuando, crecería indefinidamente, causando problemas de memoria en dispositivos de gama baja.

Además de eso, siempre llegará un momento en la vida de una caché en el que se considere "demasiado vieja" para ser mostrada al usuario, incluso como datos stale (obsoletos).

Claro, esto siempre es un acto de equilibrio. Los datos en la caché significan una aplicación más receptiva, pero los datos viejos e irrelevantes hacen más daño que bien.

Es por eso que React Query viene con un sistema de recolección de basura automática incorporado.

Si no estás familiarizado, la Recolección de Basura (GC, por sus siglas en inglés) es una forma de gestión de memoria donde la memoria que ha sido asignada por un programa se liberará automáticamente después de que ya no esté en uso. La mayoría de los lenguajes de programación de alto nivel que usamos hoy en día, incluido JavaScript, utilizan la recolección de basura en alguna medida.

React Query también lo hace, pero con un recolector basado en el tiempo llamado gcTime. Esta configuración determina cuándo los datos de una consulta deben ser eliminados de la caché, y su valor predeterminado es de 5 minutos.

Ahora podrías estar pensando: "¿esto significa que React Query eliminará los datos 5 minutos después de que hayan sido añadidos a la caché?". No.

Mientras los datos se estén utilizando activamente, no son elegibles para la recolección de basura. Por supuesto, esto plantea otra pregunta obvia: ¿qué significa exactamente "utilizado activamente"?

¿Recuerdas cómo cada vez que un componente se monta, crea un Observer por cada llamada a useQuery? Eso es lo que hace que una consulta sea activa. Y por la misma definición, una consulta que no tiene Observers se considera inactiva.

Convenientemente, los Observers se destruyen cuando un componente se desmonta y se elimina del DOM. Si no queda ninguno, React Query puede estar seguro de que debe iniciar el temporizador de recolección de basura para esa entrada en la caché.

Un ejemplo práctico sería nuestra funcionalidad de búsqueda que vimos cuando hablamos de obtener datos a demanda.

Cada búsqueda produce una nueva entrada en la caché, y tan pronto como buscamos algo nuevo, la entrada anterior se vuelve inactiva (porque el Observer cambiará para observar la nueva queryKey).

Si buscamos el mismo término en los próximos 5 minutos, obtendremos los datos servidos desde la caché (y también podríamos obtener un refetch en segundo plano si esos datos están stale).

Pero si lo buscamos de nuevo en algún momento futuro más de 5 minutos después de que el Observer inicial haya sido eliminado, la entrada de la caché ya habrá sido eliminada, y el usuario verá un indicador de carga.

Claro, el gcTime es personalizable y se puede establecer a cualquier valor que consideres apropiado al invocar useQuery.


function useIssues(search) {
  return useQuery({
    queryKey: ['issues', search],
    queryFn: () =>  fetchIssues(search),
    enabled: search !== '',
    staleTime: 5000, // 5 seconds
    gcTime: 3000, // 3 seconds
  })
}


Para demostrar esto, modifiquemos nuestro ejemplo de búsqueda para incluir un gcTime de 3000 (3 segundos), en lugar del valor predeterminado de 5 minutos. De esta manera, podremos observar cómo la entrada de la caché se elimina 3 segundos después de que ingresemos un nuevo término de búsqueda.


import * as React from "react"
import { useQuery } from '@tanstack/react-query'
import Search from "./Search"
import { fetchIssues } from "./api"

function useIssues(search) {
  return useQuery({
    queryKey: ['issues', search],
    queryFn: () =>  fetchIssues(search),
    enabled: search !== '',
    staleTime: 5000,
    gcTime: 3000,
  })
}

function IssueList ({ search }) {
  const { data, status, isLoading } = useIssues(search)

  if (isLoading) {
    return <div>...</div>
  }

  if (status === 'error') {
    return <div>There was an error fetching the issues</div>
  }

  if (status === "success") {
    return (
      <p>
        <ul>
          {data.items.map((issue) => 
            <li key={issue.id}>{issue.title}</li>
          )}
        </ul>
      </p>
    )
  }

  return <div>Please enter a search term</div>
}

export default function App() {
  const [search, setSearch] = React.useState('')

  return (
    <div>
      <Search onSubmit={(s) => setSearch(s)} />
      <IssueList search={search} />
    </div>
  )
}


Fíjate que si buscas algo, digamos useQuery, y luego buscas otra cosa, esperas tres segundos y después vuelves a buscar useQuery, verás un indicador de carga, ya que la entrada de la caché de la búsqueda inicial de useQuery habrá sido eliminada.

Ahora, hagamos lo mismo, pero esta vez, abre las devtools de React Query para que puedas ver (literalmente) lo que sucede bajo el capó (en su funcionamiento interno).

- Nota: usara mismo codigo de arriba pero usando los devtools de react query.

Primero, busca de nuevo useQuery sin perder de vista las devtools.

Verás que una vez que los datos lleguen, se mostrarán como fresh (frescos) durante 5 segundos (nuestro staleTime) y habrá un 1 en el cuadro verde a la izquierda de la entrada de la caché. Ese número muestra el contador de Observers y, dado que actualmente hemos llamado a useQuery una vez para esa clave, tenemos 1 Observer.

Ahora, busca otra cosa, digamos, "React".

Verás que la antigua entrada de la caché ["issues", "useQuery"] se mostrará como inactive (inactiva) y el número a su lado habrá cambiado a 0, lo que representa que su Observer ha sido eliminado.

Luego, después de 3 segundos (nuestro gcTime), verás que la entrada de la caché desaparecerá por completo de la caché.