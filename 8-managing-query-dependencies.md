## Managing Query Dependencies


En todos los cursos llega un momento en el que hay que dar el salto desde el terreno artificial y cómodo del código basado en tutoriales a la jungla indómita del mundo real. 
Los mejores cursos son aquellos que hacen que esta transición resulte fácil. Considera esto como tu primer paso en la jungla.


En este punto, deberías sentirte cómodo utilizando useQuery para gestionar el estado asíncrono que proviene de un punto final estático.


function useRepos() {
  return useQuery({
    queryKey: ['repos'],
    queryFn: async () => {
      const response = await fetch(
        'https://api.github.com/orgs/TanStack/repos'
      )
      
      if (!response.ok) {
        throw new Error(`Request failed with status: ${response.status}`)
      }

      return response.json()
    },
  })
}


Por desgracia, el mundo real no es tan estático. De hecho, los puntos finales estáticos suelen ser la excepción, no la norma.


Concretamente, con la API de Github que hemos estado utilizando, puedes indicarle cómo ordenar los resultados que te devuelve. Para ello, hay que pasarle un parámetro de ordenación que puede ser creado, actualizado, enviado o nombre completo.

fetch('https://api.github.com/orgs/TanStack/repos?sort=created')

Teniendo esto en cuenta, ¿cómo actualizarías el hook useRepos para que acepte un parámetro de ordenación que luego podría pasar como URL para recuperar?


Probablemente, tu primer instinto sea hacer algo como esto:


function useRepos(sort) {
  return useQuery({
    queryKey: ['repos'],
    queryFn: async () => {
      const response = await fetch(
        `https://api.github.com/orgs/TanStack/repos?sort=${sort}`
      )
      
      if (!response.ok) {
        throw new Error(`Request failed with status: ${response.status}`)
      }

      return response.json()
    },
  })
}


Por desgracia, esto no funcionará. Y antes de decirte por qué, quiero que te tomes un momento y trates de pensarlo
por ti mismo.

Si te ayuda, aquí tienes una aplicación real con la que puedes jugar.

useRepos.js:
import { useQuery } from '@tanstack/react-query'

export default function useRepos(sort) {
  return useQuery({
    queryKey: ['repos'],
    queryFn: async () => {
      const response = await fetch(
        `https://api.github.com/orgs/TanStack/repos?sort=${sort}`
      )
      
      if (!response.ok) {
        throw new Error(`Request failed with status: ${response.status}`)
      }

      return response.json()
    },
  })
}
App.js:
import * as React from "react"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import useRepos from './useRepos'

function Repos() {
  const [selection, setSelection] = React.useState('created')
  const { data, status } = useRepos(selection)

  if (status === 'pending') {
    return <div>...</div>
  }

  if (status === 'error') {
    return <div>There was an error fetching the data.</div>
  }

  return (
    <div>
      <label>
        Sort by:
        <select
          value={selection}
          onChange={(event) => {
            const sort = event.target.value
            setSelection(sort)
        }}>
          <option value="created">Created</option>
          <option value="updated">Updated</option>
          <option value="pushed">Pushed</option>
          <option value="full_name">Name</option>
        </select>
      </label>
      <ul>
        { data.map(repo => <li key={repo.id}>{repo.full_name}</li>) }
      </ul>
    </div>
  )
}

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Repos />
    </QueryClientProvider>
  )
}



¿Te das cuenta de lo que ocurre cuando intentas seleccionar una clasificación diferente en el menú desplegable de la interfaz de usuario? No ocurre nada.


Si esto te sorprende, pregúntate por qué ocurre así.


Es probable que, te des cuenta o no, estés asumiendo que React Query volverá a ejecutar queryFn cada vez que se vuelva a renderizar el componente. Pero no es así como funciona.


En retrospectiva, esto debería ser bastante obvio. Un componente puede volver a renderizarse por diversas razones, y no queremos volver a recuperar los datos cada vez que eso ocurra.


Ahora podrías hacer algo como esto, donde le dices a React Query que vuelva a recuperar los datos cada vez que cambie la clasificación.


const { data, status, refetch } = useRepos(selection)

...

onChange={(event) => {
  const sort = event.target.value
  setSelection(sort)
  refetch()
}}


Esta es una solución imperativa al problema, pero en el mundo de React, la solución declarativa es la que manda.

Entonces, ¿cómo resolvemos esto de forma declarativa?

Afortunadamente, la solución es bastante simple y tiene que ver con algo que ya conoces: la queryKey.

Cada vez que un valor en el array de la queryKey cambia, React Query volverá a ejecutar la queryFn. Esto significa que cualquier cosa que uses dentro de la queryFn también debería ser incluida en el array de la queryKey.

"Espera un minuto.

Sé lo que estás pensando: eso suena terriblemente similar al dependency array de useEffect, y ya me convenciste antes de que el dependency array de useEffect es malo.

Justo, pero la queryKey no tiene muchos de los inconvenientes que tiene useEffect.

En particular, no tienes que preocuparte de que los elementos en la queryKey sean "referencialmente estables". Puedes poner Arrays y Objetos ahí, y React Query los hasheará de forma determinística.

Nota:

El único requisito es que la queryKey sea serializable en JSON. Si quieres usar un Map o un Set, necesitarías proporcionar tu propia función queryKeyHashFn.

"

Con esto en mente, actualicemos nuestra queryKey ahora para incluir el parámetro sort.


useRepos.js:
import { useQuery } from '@tanstack/react-query'

export default function useRepos(sort) {
  return useQuery({
    queryKey: ['repos', { sort }],
    queryFn: async () => {
      const response = await fetch(
        `https://api.github.com/orgs/TanStack/repos?sort=${sort}`
      )
      
      if (!response.ok) {
        throw new Error(`Request failed with status: ${response.status}`)
      }

      return response.json()
    },
  })
}


Y así, está funcionando perfectamente.

Pero quizás la pregunta más interesante aquí es, ¿cómo funciona esto bajo el capó (en su funcionamiento interno)?

Como sabes, las queryKeys se corresponden directamente con las entradas en la caché. Después de todo, son la clave del Map de nuestra caché.

Cuando un valor en el array de la queryKey cambia, ocurre algo interesante: nuestro observer cambia lo que está observando.

Pasa de estar suscrito a una clave a estarlo a otra.


- ['repos', { sort: 'created' }]
+ ['repos', { sort: 'updated' }]


A partir de ahí, intenta leer los datos de la caché para esa clave.

Si estamos cambiando a ella por primera vez, probablemente no haya datos disponibles para esa entrada de la caché, por lo que se crea una nueva para nosotros.

La nueva entrada comienza en un estado pending, y la queryFn es llamada para obtener los datos.

En relación a nuestro ejemplo, esa es también la razón por la que vemos los ... (puntos suspensivos, indicando carga) cada vez que se selecciona un nuevo sort por primera vez, al igual que cuando el componente se montó por primera vez.

Ahora, ¿qué crees que sucede si volvemos a una queryKey que ya está en la caché? En nuestro ejemplo, created.


- ['repos', { sort: 'updated' }]
+ ['repos', { sort: 'created' }]


El observer vuelve a cambiar, pero esta vez, nuestra caché para esta clave ya está llena, por lo que useQuery es capaz de darnos esos datos al instante y el estado de la consulta pasa directamente a success.

Esto es lo que hace que la queryKey sea tan poderosa.

Al almacenar los datos por sus dependencias, React Query se asegura de que las peticiones con diferentes parámetros nunca se sobrescriban entre sí. En cambio, se guardan en caché de forma independiente, junto a las otras, bajo claves distintas, para que obtengas búsquedas en tiempo constante al cambiar entre ellas.

Después de todo, de eso se trata principalmente el caching: de poder entregar datos que hemos obtenido previamente lo más rápido posible. Y, convenientemente, esto también es lo que nos permite activar peticiones automáticas si un valor en la queryKey cambia.

También es la razón por la que React Query no sufre de condiciones de carrera; todo se maneja por ti.

Lo único de lo que debes asegurarte es de incluir en el array de la queryKey cada valor que uses dentro de la queryFn.

Claro, hacer esto manualmente puede volverse propenso a errores si se añaden más parámetros con el tiempo. Por eso, React Query también viene con su propio eslint-plugin que puede ayudarte a detectar esos errores humanos.

@tanstack/eslint-plugin-query

Una vez instalado, recibirás un mensaje de error si intentas utilizar algo dentro de queryFn que no forme parte de queryKey, e incluso te ofrecerá sugerencias para solucionar el problema.

"ESLint: The following dependencies are missing in your queryKey: sort(@tanstack/query/exhaustive-deps)"