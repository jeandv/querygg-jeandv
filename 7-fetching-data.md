## Fetching Data


Al crear aplicaciones web, la forma más habitual de generar una promesa es obteniendo datos de una API externa. Y, como ya has visto, React Query destaca en el manejo de promesas.


Dicho esto, ¿por qué nos hemos centrado hasta ahora en ejemplos que no tienen nada que ver con la obtención de datos?


Porque a React Query no le importa de dónde proviene la promesa y, al adoptar la mentalidad de que React Query es un gestor de estado asíncrono basado en promesas, puedes eliminar de antemano todo un subconjunto de preguntas:


¿Cómo puedo leer los encabezados de respuesta con React Query?
¿Cómo puedo usar GraphQL con React Query?
¿Cómo puedo añadir un token de autenticación a mis solicitudes con React Query?
Todas estas preguntas tienen la misma respuesta: lo harías como lo harías normalmente sin React Query.


De hecho, como React Query no dispara la solicitud por sí mismo, ni siquiera es consciente de ninguna de esas cosas. Lo único que le importa es el estado de la promesa y los datos con los que se resuelve.


Por supuesto, seguimos necesitando una forma de producir una promesa para dársela a React Query, y cuando se recuperan datos, la forma más común de hacerlo es con la API Fetch integrada en el navegador.

https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API


Si no lo sabes, fetch recibe una URL del recurso que deseas obtener y un objeto opcional de opciones para configurar la petición.

Una vez invocado, el navegador iniciará la petición de inmediato y te devolverá una promesa. A partir de ahí, obtener una respuesta es generalmente un proceso de dos pasos.

Primero, la promesa devuelta por fetch se resolverá con un objeto Response tan pronto como el servidor responda con los encabezados. Este objeto contiene información sobre la respuesta (como esos encabezados, el código de status HTTP, etc.), pero no contiene los datos reales.

Si no estás familiarizado con él, lo más sorprendente de fetch será que no rechaza la promesa si la petición falla. Esto significa que si el código de status de la respuesta está en el rango 4xx o 5xx, la promesa seguirá resolviéndose con normalidad.

Esto puede ser un poco contraintuitivo si intentas **catch**ear errores como lo harías con otras API basadas en promesas.

Para evitar esto, generalmente seguirás un patrón en el que compruebas si response.ok es true (lo cual será si el status de la respuesta está en el rango 2xx) y lanzas un error si no lo es.


const fetchRepos = async () => {
  try {
    const response = await fetch('https://api.github.com/orgs/TanStack/repos')

    if (response.ok) {

    } else {
      throw new Error(`Request failed with status: ${response.status}`)
    }
  } catch (error) {
    // handle network errors
  }
}


A continuación, querrás obtener los datos reales del cuerpo de la respuesta.

Suponiendo que estás obteniendo JSON, puedes llamar a .json en el objeto Response, que devolverá otra promesa que se resuelve con los datos JSON analizados.


const fetchRepos = async () => {
  try {
    const response = await fetch('https://api.github.com/orgs/TanStack/repos')

    if (response.ok) {
      const data = await response.json()
      return data
    } else {
      throw new Error(`Request failed with status: ${response.status}`)
    }
  } catch (error) {
    // handle network errors
  }
}


Ahora, si combinamos esto con nuestro conocimiento de useQuery (y específicamente de queryFn), obtenemos algo como esto.


function useRepos() {
  return useQuery({
    queryKey: ['repos'],
    queryFn: async () => {
      const response = await fetch('https://api.github.com/orgs/TanStack/repos')
      
      if (!response.ok) {
        throw new Error(`Request failed with status: ${response.status}`)
      }

      return response.json()
    },
  })
}



Hay un par de cosas que hay que tener en cuenta aquí.


En primer lugar, hemos podido eliminar nuestro código try/catch. Para indicar a React Query que se ha producido un error y, por lo tanto, establecer el estado de la consulta como error, solo hay que lanzar un error en queryFn.


En segundo lugar, hemos podido devolver response.json() directamente. Como sabes, tu función de consulta debe devolver una promesa que finalmente se resuelva con los datos que deseas almacenar en caché. Eso es exactamente lo que estamos haciendo aquí, ya que response.json() devuelve una promesa que se resuelve con los datos JSON analizados.


Y si lanzamos nuestro hook useRepos en una aplicación real, se comporta tal y como esperábamos.


import * as React from "react"
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'

const queryClient = new QueryClient()

function useRepos() {
  return useQuery({
    queryKey: ['repos'],
    queryFn: async () => {
      const response = await fetch('https://api.github.com/orgs/TanStack/repos')
      
      if (!response.ok) {
        throw new Error(`Request failed with status: ${response.status}`)
      }

      return response.json()
    },
  })
}

function Repos() {
  const { data, status } = useRepos()

  if (status === 'pending') {
    return <div>...</div>
  }

  if (status === 'error') {
    return <div>Error fetching data 😔</div>
  }

  return (
    <ul>
      { data.map(repo => <li key={repo.id}>{repo.full_name}</li>) }
    </ul>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Repos />
    </QueryClientProvider>
  )
}

NOTA:

React Query solo entiende las promesas cumplidas o rechazadas. La API de fetch no rechaza la promesa cuando la petición HTTP falla. En su lugar, resuelve la promesa con un objeto Response que tiene la propiedad ok establecida en false. React Query interpretará esto como una petición exitosa y no cambiará el estado de la consulta a error.

Para manejar peticiones HTTP fallidas, necesitas devolver una promesa rechazada o lanzar un error.

- Para usuarios de TypeScript:

Asegúrate de que tu queryFn siempre tenga un tipo de retorno especificado. De lo contrario, data tendrá por defecto el tipo any.

async function fetchRepos(): Promise<Array<RepoData>>

Alternativamente, puedes usar una asercion de tipo cuando llames a response.json:

return response.json() as Array<RepoData>

Por favor, no proporciones parámetros de tipo (genéricos) en la llamada a useQuery.

Esta es, por lo general, la peor solución posible al problema y puede introducir otros inconvenientes, ya que useQuery tiene más de un parámetro de tipo, y esto arruinará la inferencia de tipos para todos ellos.

// ❌ No hagas esto
useQuery<Array<RepoData>>({ queryKey, queryFn })

El gráfico en este tuit muestra esas opciones de forma clara.

https://twitter.com/t3dotgg/status/1556539631323078657

otro ejemplo de TS no es el tweet:

function useRepos() {
	return useQuery({
		queryKey: ["repos"],
		queryFn: async (): Promise<Array<{ id: string; full_name: string }>> => {
			const response = await fetch(
				"https://api.github.com/orgs/TanStack/repos",
			);

			if (!response.ok) {
				throw new Error(`Request failed with status: ${response.status}`);
			}

			return response.json();
		},
	});
}

otro ejemplo con typescript:

import { useQuery } from '@tanstack/react-query';

// 1. Define las interfaces para tipificar los datos
interface Pokemon {
  name: string;
  sprites: {
    front_default: string;
  };
}

// 2. Tipifica la función asíncrona que obtiene los datos
async function fetchPokemonData(id: number): Promise<Pokemon> {
  const url = `https://pokeapi.co/api/v2/pokemon/${id}`;

  const res = await fetch(url);
  
  if (!res.ok) {
    throw new Error(`Error en la petición: ${res.status}`);
  }

  const data: Pokemon = await res.json();
  return data;
}

// 3. Usa el hook useQuery en el componente
// y deja que infiera los tipos de `data` y `error`
function Pokemon({ pokemonId }: { pokemonId: number }) {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['pokemon', pokemonId],
    queryFn: () => fetchPokemonData(pokemonId),
  });

  if (isPending) return <div>Cargando...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>{data.name}</h1>
      <img src={data.sprites.front_default} alt={data.name} />
    </div>
  );
}