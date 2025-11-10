## Infinite Queries

Hace casi 20 años, el ingeniero de UI Aza Raskin inventó algo de lo que más tarde se arrepentiría profundamente: el scroll infinito. Este patrón, que permite a los usuarios desplazarse sin fin a través del contenido, se ha convertido desde entonces en un pilar para plataformas de redes sociales como Facebook, Pinterest e Instagram.

A pesar de su arrepentimiento, React Query hace que implementarlo sea ~sencillo.

Ya has visto cómo con la paginación tradicional, puedes crear una interfaz de usuario paginada simplemente incluyendo el número de página en la queryKey.

Con las listas infinitas, el hecho de que useQuery solo pueda mostrar datos para el queryKey actual funciona en nuestra desventaja.

Lo que realmente queremos es tener una única entrada de caché a la que podamos añadir (append) los datos cada vez que obtengamos información nueva.

Esto es exactamente lo que te permite hacer el hook useInfiniteQuery de React Query. Funciona casi igual que useQuery, pero existen algunas diferencias fundamentales.

Tanto al solicitar datos para listas infinitas como para listas paginadas, obtienes los datos a lo largo del tiempo en bloques (chunks). Para hacer esto, necesitas una forma de saber qué ya has solicitado y qué solicitar a continuación.

Típicamente, como vimos en nuestro ejemplo de Repositorios, esto se hace a través de un número de página.

Con nuestro ejemplo de paginación, creamos el número de página con el estado de React, permitimos que el usuario lo incrementara y decrementara a través de la UI, y luego lo pasamos a nuestro custom hook para usarlo dentro de la queryKey y la queryFn.


const [page, setPage] = React.useState(1)

...

const { data, status } = useRepos(sort, page)


Con las listas infinitas y el hook useInfiniteQuery, la idea es la misma, pero la implementación es un poco diferente. En lugar de tener que gestionar tú mismo el estado de la página en React, useInfiniteQuery lo gestionará por ti.

Así es como funciona:

Supongamos que estuviéramos obteniendo publicaciones de la API de dev.to nuevamente, y tuviéramos una función fetchPosts con este aspecto, donde recibe la página a solicitar:


export async function fetchPosts(page) {
  const url = `https://dev.to/api/articles?per_page=6&page=${page}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch posts for page #${page}`)
  }

  return response.json()
}


Al invocar fetchPosts con una lista infinita, lo más probable es que comiences en la página 1 y vayas incrementando a partir de ahí.

Dicho esto, si useInfiniteQuery va a gestionar esta página por nosotros, tiene sentido que necesitemos darle algunas cosas para que pueda hacerlo.

Específicamente, necesitamos decirle en qué página comenzar (1, en nuestro caso) y cómo llegar a la página siguiente.

Para decirle en qué página comenzar, puedes proporcionarle un initialPageParam. Este valor se pasará a la queryFn la primera vez que se llame, para que puedas utilizarlo en tu solicitud a la API.


function usePosts() {
  return useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: ({ pageParam }) => fetchPosts(pageParam),
    initialPageParam: 1,
  })
}


No lo habíamos usado antes, pero React Query siempre pasa un objeto (llamado QueryFunctionContext) a la queryFn con la información que tiene sobre la consulta en sí.

Como puedes ver, es a través del QueryFunctionContext que podemos acceder al initialPageParam.

A partir de aquí, todo lo que necesitamos hacer es decirle a React Query cómo obtener la página siguiente.

Podemos lograr eso añadiendo un método getNextPageParam a nuestro objeto de opciones.


function usePosts() {
  return useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: ({ pageParam }) => fetchPosts(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      
    }
  })
}


Al ser invocado, React Query pasará al método getNextPageParam tres argumentos: lastPage, allPages, y lastPageParam.

lastPage: Son los datos de la última página solicitada.

allPages: Es un array de todas las páginas solicitadas hasta ahora.

lastPageParam: Es el parámetro de página (pageParam) que se utilizó para solicitar la última página.

Utilizando estos tres argumentos, deberías poder deducir cuál será la página siguiente y devolverla. En nuestro caso, tomaremos el valor de lastPageParam y le sumaremos 1.


function usePosts() {
  return useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: ({ pageParam }) => fetchPosts(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      return lastPageParam + 1 
    }
  })
}


Además, si quieres indicarle a React Query que no quedan más páginas por solicitar, puedes devolver undefined.

En nuestro ejemplo, si la última página que solicitamos estaba vacía, es una suposición segura que ya no hay más páginas.


function usePosts() {
  return useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: ({ pageParam }) => fetchPosts(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      if (lastPage.length === 0) {
        return undefined
      }

      return lastPageParam + 1
    }
  })
}


APIS con Cursóres (Cursor Based APIs)

No es raro que las consultas infinitas se utilicen con APIs basadas en cursores (cursor based APIs), donde cada página devuelve un cursor que apunta a la página siguiente como parte de su resultado.


fetch('/api/projects?cursor=0')
// { data: [...], nextCursor: 3}
fetch('/api/projects?cursor=3')
// { data: [...], nextCursor: 6}
fetch('/api/projects?cursor=6')
// { data: [...], nextCursor: 9}


En estos casos, la última página solicitada incluiría el nextCursor, el cual podríamos devolver como el valor de pageParam.


// Ejemplo de useInfiniteQuery con cursor
useInfiniteQuery({
  queryKey: ['projects'],
  queryFn: ({ pageParam }) => projects(pageParam),
  getNextPageParam: (lastPage) => {
    // Retornamos el nextCursor que viene en el objeto de la última página
    return lastPage.nextCursor;
  }
})


Recuerda, cada página es el dato devuelto por la función de consulta para esa página. Si necesitas usar el valor nextCursor que fue devuelto por la API, debes escribir tu función de consulta para que lo devuelva.

Ahora, en este punto, ya sabes cómo introducir datos en la caché con useInfiniteQuery, pero ¿cómo los extraes?

Esto nos lleva a la otra diferencia principal entre useQuery y useInfiniteQuery: la forma de los datos que te proporciona.

Con useQuery, solo obtienes los datos que están en la caché para el queryKey. Con useInfiniteQuery, a menudo es útil tener tanto los datos como la página a la que están asociados.

Para lograr esto, el objeto que te da useInfiniteQuery tiene esta estructura: los datos se separan en un array multidimensional de pages, donde cada elemento en el array contiene todos los datos de una página específica.


{
 "data": {
   "pages": [
     [ {}, {}, {} ],
     [ {}, {}, {} ],
     [ {}, {}, {} ]
   ],
   "pageParams": [1, 2, 3]
 }
}


Y si prefieres tener un array normal y plano, siempre puedes usar el método incorporado de JavaScript Array.flat para aplanar el array de páginas.


const { data } = usePosts()

const posts = data?.pages.flat() // [ {}, {}, {} ]


Así que ahora, si ponemos todo esto en una aplicación, este es el punto en el que nos encontramos.


import * as React from "react"
import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchPosts } from './api'

function usePosts() {
  return useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: ({ pageParam }) => fetchPosts(pageParam),
    staleTime: 5000,
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      if (lastPage.length === 0) {
        return undefined
      }

      return lastPageParam + 1
    }
  })
}

export default function Blog() {
  const { status, data } = usePosts()

  if (status === 'pending') {
    return <div>...</div>
  }

  if (status === 'error') {
    return <div>Error fetching posts</div>
  }

  return (
    <div>
      {data.pages.flat().map((post) => (
        <p key={post.id}>
          <b>{post.title}</b>
          <br />
          {post.description}
        </p>
      ))}
    </div>
  )
}


Un inicio sólido.

Pero, por supuesto, todavía no hemos hecho nada que sea particularmente "infinito". Vamos a arreglar eso.

En el ejemplo de paginación, debido a que gestionábamos la página con el estado de React, todo lo que teníamos que hacer para obtener la página siguiente era incrementar ese estado cuando se hacía clic en un botón.


<button onClick={() => setPage((p) => p + 1)}>
  Next
</button>


Pero ahora, useInfiniteQuery está gestionando la página por nosotros. Debido a esto, nos proporciona una función fetchNextPage que, al ser invocada, obtendrá el nuevo pageParam llamando a getNextPageParam y luego invocará la queryFn con ese parámetro.


const { status, data, fetchNextPage } = usePosts()


Así que si ahora añadimos un botón al final de nuestra lista que invoca a fetchNextPage, obtendremos nuestra primera lista infinita.


import * as React from "react"
import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchPosts } from './api'

function usePosts() {
  return useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: ({ pageParam }) => fetchPosts(pageParam),
    staleTime: 5000,
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      if (lastPage.length === 0) {
        return undefined
      }

      return lastPageParam + 1
    }
  })
}

export default function Blog() {
  const { status, data, fetchNextPage } = usePosts()

  if (status === 'pending') {
    return <div>...</div>
  }

  if (status === 'error') {
    return <div>Error fetching posts</div>
  }

  return (
    <div>
      {data.pages.flat().map((post) => (
        <p key={post.id}>
          <b>{post.title}</b>
          <br />
          {post.description}
        </p>
      ))}

      <button onClick={() => fetchNextPage()}>
        More
      </button>
    </div>
  )
}


Y si quisiéramos, podríamos hacer que nuestro botón fuera más inteligente dándole cierta metainformación sobre el estado de la consulta. Específicamente:

isFetchingNextPage será true cuando la solicitud para la página siguiente esté en curso.

hasNextPage será true si hay otra página para solicitar. Esto se determina al llamar a getNextPageParam y comprobar si se devolvió undefined.

Podemos usar ambos valores para deshabilitar nuestro botón "Más" condicionalmente y para darle un indicador de carga mientras React Query está solicitando la página siguiente.


<button
  onClick={() => fetchNextPage()}
  disabled={!hasNextPage || isFetchingNextPage}
>
  { isFetchingNextPage ? '...' : 'More' }
</button>


Y no es necesario que las consultas infinitas sean solo en una dirección. Hasta ahora, solo hemos visto consultas que comienzan al principio y luego solicitan hacia adelante para obtener más páginas, pero ese podría no ser siempre el caso.

Por ejemplo, supongamos que estás creando una aplicación de mensajería que admite enlaces profundos a cualquier mensaje. En ese escenario, el usuario se encontraría en medio de una conversación y necesitaría solicitar datos tanto hacia atrás como hacia adelante para obtener el contexto completo.

Afortunadamente, solicitar datos hacia atrás sigue un patrón similar a solicitar hacia adelante, solo que con valores con nombres más apropiados.

Por ejemplo, en lugar de getNextPageParam, que recibe lastPage, allPages y lastPageParam, usarás getPreviousPageParam, que recibe firstPage, allPages y firstPageParam.


useInfiniteQuery({
  queryKey,
  queryFn,
  initialPageParam,
  getNextPageParam: (lastPage, allPages, lastPageParam) => {
    if (lastPage.length === 0) {
      return undefined
    }

    return lastPageParam + 1
  }
  getPreviousPageParam: (firstPage, allPages, firstPageParam) => {
    if (firstPageParam <= 1) {
      return undefined
    }

    return firstPageParam - 1
  }
})


Ahora sé lo que estás pensando: "Todo esto está genial, pero no es lo suficientemente adictivo. Quiero que el cerebro de mi usuario se convierta en papilla mientras se desplazan por mi aplicación —en contra de su voluntad— para que yo pueda maximizar la cantidad de ingresos publicitarios que obtengo de ellos".

No digas más.

La buena noticia es que no hay nada nuevo relacionado con React Query que necesites saber para esto. En su lugar, se trata simplemente de activar fetchNextPage cuando el usuario se desplaza hasta el final de la lista.

Para hacer el trabajo pesado, vamos a aprovechar el hook useIntersectionObserver de useHooks. https://usehooks.com/useintersectionobserver

Funciona dándote una ref y una entry.


import { useIntersectionObserver } from "@uidotdev/usehooks";

...

const [ref, entry] = useIntersectionObserver();


Siempre que el elemento al que está adjuntada la ref entra en el campo de visión, entry.isIntersecting será true.

Combina eso con algo de la magia de useEffect, y podemos activar fetchNextPage cuando el usuario se desplaza hasta el final de la lista.

Me estoy poniendo un poco inusualmente ambiguo aquí porque no quiero abrumarte con detalles sin importancia que no están relacionados con React Query.


import * as React from "react"
import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchPosts } from './api'
import { useIntersectionObserver } from "@uidotdev/usehooks";

function usePosts() {
  return useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: ({ pageParam }) => fetchPosts(pageParam),
    staleTime: 5000,
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      if (lastPage.length === 0) {
        return undefined
      }

      return lastPageParam + 1
    }
  })
}

export default function Blog() {
  const { status, data, fetchNextPage, hasNextPage, isFetchingNextPage } = usePosts()

  const [ref, entry] = useIntersectionObserver();

  React.useEffect(() => {
    if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [entry?.isIntersecting, hasNextPage, isFetchingNextPage])

  if (status === 'pending') {
    return <div>...</div>
  }

  if (status === 'error') {
    return <div>Error fetching posts</div>
  }

  return (
    <div>
      {data.pages.flat().map((post, index, pages) => (
        <p key={post.id}>
          <b>{post.title}</b>
          <br />
          {post.description}
          {index === pages.length - 3
              ? <div ref={ref} />
              : null}
        </p>
      ))}
    </div>
  )
}


Genial. Nuestros usuarios ahora pueden desplazarse para siempre 👹.

Ahora, hay una última cosa relacionada con las consultas infinitas de la que debemos hablar antes de terminar, y es el refetching (la recarga de datos).

Uno de los aspectos más valiosos de React Query es que mantiene tus datos actualizados en segundo plano con refetches automáticos. Esto asegura que los datos que el usuario ve estén siempre frescos.

Pero, ¿cómo funciona el refetching con las consultas infinitas?

La idea es bastante sencilla: React Query vuelve a solicitar la primera página en la caché (independientemente de cuál sea initialPageParam), llama a getNextPageParam para obtener la página siguiente y luego solicita esa página. Este proceso continúa hasta que todas las páginas han sido recargadas o hasta que se devuelve undefined desde getNextPageParam.

Funciona de esta manera por una razón importante: la Consistencia.

Una consulta infinita es solo una única entrada de caché, por lo que si bien cada página es una solicitud separada, eventualmente forman una larga lista en nuestra interfaz de usuario. Si solo recargáramos algunas de las consultas, React Query no podría garantizar la consistencia.

Por ejemplo, consideremos que tenemos dos páginas en la caché con un pageSize de 4. La primera página muestra los IDs del 1 al 4, y la segunda muestra los IDs del 5 al 8.

Si se eliminara el ID 3 en el backend, y solo volviéramos a solicitar la página 1, nuestra página 2 quedaría desincronizada y ambas páginas tendrían una entrada duplicada del 5 en la caché.

Por otro lado, si se agregara una entrada en la página 1, digamos con un ID de 0, y solo solicitáramos la página 1, entonces la entrada con el ID de 4 se perdería de la caché.

Todo esto quiere decir que React Query no puede tomar atajos cuando se trata de recargas (refetches) de consultas infinitas: siempre tiene que solicitar todas las páginas para garantizar la consistencia.

Como te puedes imaginar, si hubiera muchas páginas en la caché, esto podría ser problemático tanto desde la perspectiva de la red como de la memoria.

Para evitar este problema, puedes darle a useInfiniteQuery una opción maxPages que limita el número de páginas que React Query mantendrá en la caché.

Así, por ejemplo, si tuvieras un maxPages de 3, incluso si tuvieras consultas infinitas bidireccionales, React Query (de forma inteligente) solo mantendría tres páginas en la caché.

useInfiniteQuery puede ser un poco más complicado que useQuery, pero las experiencias de usuario que permite serían increíblemente difíciles de lograr sin él.

Al igual que todo lo demás en React Query, con solo un poco de configuración, useInfiniteQuery gestiona las complejidades de la administración de la caché por ti, permitiéndote concentrarte en lo que realmente importa: crear una gran experiencia de usuario.