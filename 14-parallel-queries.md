## Parallel Queries

En este punto, has visto varios ejemplos de cómo useQuery crea una abstracción simple para gestionar el estado asíncrono. Sin embargo, todos esos ejemplos tenían una cosa en común: todos obtenían un único recurso.

En el mundo artificial de los tutoriales cuidadosamente elaborados, esto está bien. Pero en el mundo real, casi nunca obtienes un solo recurso.

Cualquier aplicación seria probablemente tendrá múltiples consultas ocurriendo en paralelo, y un principio obvio del desarrollo web es que:

"Cuanto más puedas hacer en paralelo, mejor."

Por ejemplo, supón que estamos creando un Panel de Visión General (Overview Dashboard) de nuestra organización de GitHub. Además de mostrar todos los repositorios, también queremos mostrar a todos los miembros de esa organización.

Esos dos recursos no tienen nada que ver entre sí. No son dependientes y no hay necesidad de esperar a que una petición se resuelva antes de comenzar la otra.

En este escenario, querrías ejecutarlas ambas en paralelo para poder mostrar los datos al usuario lo más rápido posible.

React Query tiene varias formas de lograr esto, la más sencilla es simplemente llamar a useQuery varias veces:


function useRepos() {
  return useQuery({
    queryKey: ['repos'],
    queryFn: fetchRepos,
  })
}

function useMembers() {
  return useQuery({
    queryKey: ['members'],
    queryFn: fetchMembers,
  })
}


Ahora, cuando llamamos a estos hooks personalizados, React Query disparará la obtención de datos (fetches) simultáneamente y los datos se mostrarán tan pronto como estén disponibles, sin importar qué consulta se resuelva primero.


App.js:
import { useQuery } from '@tanstack/react-query'
import { fetchRepos, fetchMembers } from './api'

function useRepos() {
  return useQuery({
    queryKey: ['repos'],
    queryFn: fetchRepos
  })
}

function useMembers() {
  return useQuery({
    queryKey: ['members'],
    queryFn: fetchMembers
  })
}

export default function App() {
  const repos = useRepos()
  const members = useMembers()

  return (
    <div>
      <h1>TanStack Dashboard</h1>
      <h2>Repos</h2>
      {repos.isPending ? <p>Loading repos...</p> : null}
      {repos.isError ? <p>Error loading repos: {repos.error.message}</p> : null}
      {repos.isSuccess 
        ? <ul>
            {repos.data.map((repo) => (
              <li key={repo.id}>{repo.name}</li>
            ))}
          </ul>
        : null}

      <hr />

      <h2>Members</h2>
      {members.isPending ? <p>Loading members...</p> : null}
      {members.isError ? <p>Error loading members: {members.error.message}</p> : null}
      {members.isSuccess 
        ? <ul>
            {members.data.map((member) => (
              <li key={member.id}>{member.login}</li>
            ))}
          </ul>
        : null
      }
    </div>
  )
}


Con este enfoque, tenemos dos partes separadas de la interfaz de usuario, cada una realizando su propia consulta.

Esto funciona, pero tal como está, nuestra aplicación tiene el comportamiento tradicional de las SPA (Aplicaciones de Página Única) de mostrar indicadores de carga en múltiples partes de la interfaz de usuario, los cuales serán reemplazados por datos en momentos diferentes. Si no tienes cuidado, esto podría llevar a un comportamiento brusco y a cambios en el layout (diseño).

Si eso no es necesario (o deseado) y prefieres esperar hasta que todas las consultas hayan finalizado antes de renderizar cualquier parte de la interfaz de usuario, tienes algunas opciones diferentes.

Primero, como ya has visto antes cuando hablamos de consultas dependientes, podrías combinar las múltiples peticiones de obtención de datos en una sola consulta con la ayuda de Promise.all.


function useReposAndMembers() {
  return useQuery({
    queryKey: ['reposAndMembers'],
    queryFn: () => {
      return Promise.all([fetchRepos(), fetchMembers()])
    }
  })
}


Ahora tendrías un estado de carga, un estado de error y datos consolidados para ambos recursos, lo que facilita mostrar una interfaz de usuario unificada.

Sin embargo, al igual que vimos en la lección de consultas dependientes, este enfoque tiene algunas desventajas.

Los repositorios y los miembros siempre se obtendrán y se volverán a obtener juntos.

Los repositorios y los miembros siempre generarán error juntos.

No podemos reutilizar los repositorios o los miembros por separado en otras partes de nuestra aplicación.

Aunque no tienen correlación, hemos almacenado en caché y, por lo tanto, acoplado nuestros dos recursos. Funciona, y es posiblemente más fácil de gestionar, pero tiene el costo de la flexibilidad.

Si lo piensas, lo que realmente queremos aquí es la capacidad de almacenar los recursos en caché por separado, pero aun así llamarlos juntos en un hook unificado. Esa combinación nos daría lo mejor de ambos mundos.

Esto es esencialmente lo que hace el hook useQueries.

Le pasas un array de consultas, y de forma similar a Promise.all, las ejecutará en paralelo y devolverá un array de resultados donde el orden de los elementos es el mismo que el orden de las consultas.


function useReposAndMembers() {
  return useQueries({
    queries: [
      {
        queryKey: ['repos'],
        queryFn: fetchRepos,
      }, 
      {
        queryKey: ['members'],
        queryFn: fetchMembers,
      }
    ]
  })
}

...

const [repos, members] = useReposAndMembers()


Esto te da la flexibilidad de almacenar en caché los repositorios y los miembros por separado, con la comodidad de un único hook.

Y con el Poder de JavaScript™, puedes derivar fácilmente cualquier valor que necesites del array.

Por ejemplo, si quisieras mostrar un indicador de carga mientras cualquiera de las consultas aún se está obteniendo (fetching), podrías derivar ese valor así.


const queries = useReposAndMembers()

const areAnyPending = queries.some(
  query => query.status === 'pending'
)


O si solo quisieras mostrar un indicador de carga mientras todas las consultas aún se están procesando, podrías derivarlo así.


const queries = useReposAndMembers()

const isAnyPending = queries.every(
  query => query.status === 'pending'
)


En cualquier caso, tienes la posibilidad de inspeccionar cada consulta individualmente, al tiempo que puedes ver todas las consultas en su conjunto.


Compartir Opciones de Consulta (Query Options):

Las  Query Options (Opciones de Consulta) son el objeto que pasas a hooks como useQuery o useQueries. Siempre constan de queryKey y queryFn, pero pueden tener muchas más propiedades como staleTime o gcTime.

Para hacerlas compartibles entre diferentes hooks, generalmente es una buena idea separarlas en constantes y luego importarlas donde se necesiten:


export const repoOptions = {
  queryKey: ['repos'],
  queryFn: fetchRepos,
}

export const membersOptions = {
  queryKey: ['members'],
  queryFn: fetchMembers,
}

...

const useRepos = () => useQuery(repoOptions)
const useMembers = () => useQuery(membersOptions)

...

const useReposAndMembers = () => useQueries({
  queries: [repoOptions, membersOptions]
})


Quizás la mejor parte del hook useQueries de la que aún no hemos hablado es que el array de consultas que le pasas puede ser dinámico.

Esto permite la capacidad de crear un número arbitrario de consultas basándose en alguna entrada.

Por ejemplo, digamos que quisieras obtener todos los issues (problemas) para todos los repositorios en tu organización. Así es como podrías abordarlo:

1 - Obtener los repositorios con un hook useRepos:


function useRepos() {
  return useQuery({
    queryKey: ['repos'],
    queryFn: fetchRepos
  })
}


2- Obtener los issues (problemas) de cada repositorio con un hook useIssues.

Este paso es un poco más complejo.

Primero, vamos a querer que useIssues acepte un array de repositorios como su único argumento.


function useIssues(repos) {

}


A continuación, podemos invocar useQueries, mapeando sobre los repos para crear nuestro array de queries (consultas).


function useIssues(repos) {
  return useQueries({
    queries: repos?.map((repo) => ({
      
    }))
  })
}


Para la queryKey, usemos una clave que represente la entrada en la caché: repos/${repo.name}/issues.


function useIssues(repos) {
  return useQueries({
    queries: repos?.map((repo) => ({
      queryKey: ['repos', repo.name, 'issues'],
    }))
  })
}

Para la queryFn, querremos obtener todos los issues (problemas) para el repositorio sobre el que estamos iterando actualmente y devolverlos para que sean colocados en la caché.


function useIssues(repos) {
  return useQueries({
    queries: repos?.map((repo) => ({
      queryKey: ['repos', repo.name, 'issues'],
      queryFn: async () => {
        const issues = await fetchIssues(repo.name)
        return { repo: repo.name, issues }
      }
    }))
  })
}


Lo último que querremos hacer es asegurarnos de que si repos es undefined (lo que sucederá mientras la consulta esté pending o pendiente), nuestra propiedad queries siga siendo un array vacío.

Hay varias formas de lograr esto, la más simple es con el operador de fusión de nulos (nullish coalescing operator) de JavaScript.


function useIssues(repos) {
  return useQueries({
    queries: repos?.map((repo) => ({
      queryKey: ['repos', repo.name, 'issues'],
      queryFn: async () => {
        const issues = await fetchIssues(repo.name)
        return { repo: repo.name, issues }
      }
    })) ?? []
  })
}


Ahora, por cada repo dentro de nuestro array de repos, estamos creando una nueva consulta que obtiene los issues (problemas) para ese repositorio y actualiza la caché.

Esto es lo que hace que useQueries sea tan potente: nos permite crear dinámicamente un número arbitrario de consultas, todas en paralelo.

Y si colocamos nuestros hooks en una aplicación real, podemos verlos en acción.


App.js:
import { useQuery, useQueries } from '@tanstack/react-query'
import { fetchRepos, fetchIssues } from './api'

function useRepos() {
  return useQuery({
    queryKey: ['repos'],
    queryFn: fetchRepos
  })
}

function useIssues(repos) {
  return useQueries({
    queries: repos?.map((repo) => ({
      queryKey: ['repos', repo.name, 'issues'],
      queryFn: async () => {
        const issues = await fetchIssues(repo.name)
        return { repo: repo.name, issues }
      }
    })) ?? []
  })
}

export default function App() {
  const repos = useRepos()
  const issues = useIssues(repos.data)

  return (
    <div>
      <h1>TanStack Dashboard</h1>
      <h2>Repos</h2>
      {repos.isPending ? <p>Loading repos...</p> : null}
      {repos.isError 
        ? <p>Error loading repos: {repos.error.message}</p>
        : null}
      {repos.isSuccess 
        ? <ul>
            {repos.data.map((repo) => {
              const repoIssues = issues.find(
                query => query.data?.repo === repo.name
              )

              const length = repoIssues?.data.issues.length
              
              return (
                <li key={repo.id}>
                  {repo.name}
                  {repoIssues
                    ? ` (${length === 30 ? "30+" : length} issues)`
                    : null
                  }
                </li>
              )
            })}
          </ul>
        : null}
    </div>
  )
}


api.js:
export async function fetchRepos() {
  const response = await fetch(
    `https://api.github.com/orgs/TanStack/repos`
  )

  if (response.status === 403) {
    throw new Error("You've been rate limited by the Github API.")
  }

  if (!response.ok) {
    throw new Error('fetch failed')
  }

  return response.json()
}

export async function fetchIssues(repo) {
  const response = await fetch(
    `https://api.github.com/repos/TanStack/${repo}/issues`
  )

  if (response.status === 403) {
    throw new Error("You've been rate limited by the Github API.")
  }
  
  if (!response.ok) {
    throw new Error('fetch failed')
  }

  return response.json()
}


Sin useQueries, la única otra forma de lograr esto sería renderizar un componente separado para cada repo y luego obtener los issues (problemas) dentro de él.


export default function App() {
  const repos = useRepos()

  return (
    <div>
      <h1>TanStack Dashboard</h1>
      <h2>Repos</h2>
      {repos.isPending ? <p>Loading repos...</p> : null}
      {repos.isError 
        ? <p>Error loading repos: {repos.error.message}</p>
        : null}
      {repos.isSuccess 
        ? <ul>
            {repos.data.map((repo) => {
              return (
                <li key={repo.id}>
                  {repo.name}
                  <RepoIssues repo={repo.name} />
                </li>
              )
           })}
          </ul>
        : null}
    </div>
  )
}


Esto funcionaría, pero la contrapartida es que si necesitaras derivar un valor basado en todas las consultas, tendrías un problema.

Por ejemplo, digamos que quisiéramos actualizar la interfaz de usuario de nuestra aplicación para incluir el número total de issues (problemas) en todos los repositorios.

Si lo único que hicieras fuera renderizar un componente separado para cada repo, obteniendo los issues (problemas) dentro de él, sería complicado derivar el número total de issues en todos los repositorios, ya que las consultas estarían aisladas.

Sin embargo, si utilizaras useQueries como hicimos inicialmente, tendrías un par de opciones.

Primero, simplemente podrías usar el Poder de JavaScript™ para derivar el número total de issues del array de consultas.


...

const repos = useRepos()
const issues = useIssues(repos.data)

const totalIssues = issues
  .map(({ data }) => data?.issues.length ?? 0)
  .reduce((a, b) => a + b, 0)

...


O si lo prefieres, useQueries también viene con una opción combine que hace exactamente lo mismo, pero integrado en la propia API de useQueries.

La forma en que funciona es que le pasas a combine una función que toma el array de consultas como su primer argumento, y lo que sea que esta función devuelva será lo que useQueries retorne.

Así, por ejemplo, si quisiéramos usar combine para añadir una propiedad totalIssues al objeto devuelto por useIssues, podríamos hacer algo como esto.


App.js:
import { useQuery, useQueries } from '@tanstack/react-query'
import { fetchRepos, fetchIssues } from './api'

function useRepos() {
  return useQuery({
    queryKey: ['repos'],
    queryFn: fetchRepos
  })
}

function useIssues(repos) {
  return useQueries({
    queries: repos?.map((repo) => ({
      queryKey: ['repos', repo.name, 'issues'],
      queryFn: async () => {
        const issues = await fetchIssues(repo.name)
        return { repo: repo.name, issues }
      },
    })) ?? [],
    combine: (issues) => {
      const totalIssues = issues
        .map(({ data }) => data?.issues.length ?? 0)
        .reduce((a, b) => a + b, 0)

      return { issues, totalIssues }
    }
  })
}

export default function App() {
  const repos = useRepos()
  const { issues, totalIssues } = useIssues(repos.data)

  return (
    <div>
      <h1>TanStack Dashboard</h1>
      <h2>Repos ({totalIssues}+ issues) </h2>
      {repos.isPending ? <p>Loading repos...</p> : null}
      {repos.isError 
        ? <p>Error loading repos: {repos.error.message}</p>
        : null}
      {repos.isSuccess 
        ? <ul>
            {repos.data.map((repo) => {
              const repoIssues = issues.find(
                query => query.data?.repo === repo.name
              )

              const length = repoIssues?.data.issues.length
              
              return (
                <li key={repo.id}>
                  {repo.name}
                  {repoIssues
                    ? ` (${length === 30 ? "30+" : length} issues)`
                    : null
                  }
                </li>
              )
            })}
          </ul>
        : null}
    </div>
  )
}


Independientemente de la opción que elijas, el punto más importante es que useQueries te da la flexibilidad de crear un número arbitrario de consultas, todas en paralelo, y luego derivar cualquier valor que necesites del conjunto total de consultas.


Para Usuarios de TypeScript
Los tipos para useQueries son bastante avanzados. Si pasas un Array estático, se te devolverá una tupla para que puedas desestructurar de forma segura. Esto debería funcionar incluso si cada consulta devuelve una forma diferente. Para los Arrays dinámicos, se te devolverá un Array de QueryResult.

Es especialmente importante aprovechar la inferencia de tipos tanto como sea posible aquí. Lo más probable es que algo falle si intentas especificar un parámetro de tipo específico.

Echa un vistazo a este TypeScript playground para ver algunos ejemplos.

https://www.typescriptlang.org/play?#code/JYWwDg9gTgLgBAbzgVwM4FMCKz1WO1OAXzgDMoIQ4ByAARgEMA7VRgYwGsB6KdBtmAFoAjjigBPagFgAULLYQW8ANq9IqADRwQ6EACNcqALpwAvCgzZc+VAAoEsuHFHWCALjjLHTxN5-OxcQBpdHEPZWo1CFRqIw0-HxcJADEmD1sASjMAPjgABQoQYAwAOl5UCAAbADd0W2pSCAhqDPiZfyI2-wd2-wDcYNDw6h19Q1iuvqTxVPSs01yCymL0MoIq2tsARlaEzu842SIM2Vko1BKAEwZGWS4uOAA9AH5TmVGDKAvr25l7p9eciBCiUcGKqBwhHMaCwYhs9m8SRs4S2GgATBoAMxGEogBhgWzAS45OC2BI9Pr9CQhMKeajgyHULREw69fzTWak+aLQorNYVGp1Im7NnEbwZEXHN4Mgh3B4vIA