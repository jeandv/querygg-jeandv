## Managing Query Keys


A medida que una aplicación que utiliza React Query crece, también lo hace la complejidad en torno a la gestión de las query keys (claves de consulta). Ya hemos visto un ejemplo sutil de esto al tratar con mutaciones.

Defines una queryKey en un hook personalizado en una parte de tu aplicación, y luego, para invalidar o mutar esa query, necesitas usar la misma key en otro hook en una parte diferente de la aplicación.


export default function useTodos(sort) {
  return useQuery({
    queryKey: ['todos', 'list', { sort }], // Definición
    queryFn: () => fetchTodos(sort)
  })
}

useMutation({
  mutationFn,
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: ['todos', 'list'] // Recreación
    })
  }
})


Hasta este punto, simplemente hemos estado recreando el array queryKey y esperando que todo salga bien. Funciona, pero es exactamente el tipo de cosa que arruinará tu tarde cuando cometas un error tipográfico en una de las keys.

Un enfoque para gestionar esta complejidad es utilizar Fábricas de Query Keys (Query Key Factories), donde defines todas tus queryKeys en una única ubicación.


export const todoKeys = {
  allLists: () => ['todos', 'list'],
  list: (sort) => ['todos', 'list', { sort }],
}


Ahora, en cualquier lugar donde necesites acceder a una queryKey, puedes hacerlo importando el objeto todoKeys.


import { useQuery } from '@tanstack/react-query'
import { todoKeys } from './keys'

export default function useTodos(sort) {
  return useQuery({
    queryKey: todoKeys.list(sort), // Uso de la fábrica
    queryFn: () => fetchTodos(sort)
  })
}


import { useMutation } from '@tanstack/react-query'
import { todoKeys } from './keys'

useMutation({
  mutationFn,
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: todoKeys.allLists() // Uso de la fábrica
    })
  }
})


Es sutil, pero ahora no tienes que preocuparte por errores tipográficos que arruinen tu tarde o por la jerarquía específica de las query keys individuales.

Incluso podemos llevar esto un poco más lejos si realmente te preocupa la duplicación, utilizando un poco de composición.

Observa que dentro de nuestra fábrica, hemos escrito las strings 'todo' y 'list' varias veces.


export const todoKeys = {
  allLists: () => ['todos', 'list'],
  list: (sort) => ['todos', 'list', { sort }],
}


Para abordar esto, puedes crear keys más específicas componiéndolas a partir de las más genéricas.


const todoKeys = {
  all: () => ['todos'],
  allLists: () => [...todoKeys.all(), 'list'],
  list: (sort) => [...todoKeys.allLists(), { sort }],
}


Ahora cada key se construye sobre la anterior y solo añade lo que la hace específicamente única.

El inconveniente, por supuesto, es que es menos legible, lo que hace más difícil saber qué contendrá finalmente cada key.


Para usuarios de TypeScript,

Para obtener la inferencia de tipo más específica y estrecha para tus queryKeys, probablemente querrás añadir una aserción const a cada una de ellas:

TypeScript

// Ejemplo con aserción const:
export const todoKeys = {
  // Sin 'as const', TypeScript podría inferir ['todos', string], perdiendo la especificidad.
  // Con 'as const', infiere ['todos'] y se sabe que solo contiene la string 'todos'.
  all: () => ['todos'] as const, 
  
  // infiere ['todos', 'list']
  allLists: () => ['todos', 'list'] as const, 
  
  // infiere ['todos', 'list', { sort: string | undefined }]
  list: (sort?: string) => ['todos', 'list', { sort }] as const, 
  
  // infiere ['todos', 'detail', string]
  detail: (id: string) => ['todos', 'detail', id] as const,
};


https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html#const-assertions


La última cosa sobre las Fábricas de Query Keys es que se recomienda crear una fábrica por cada característica y hacer que todas las queryKeys de esa fábrica comiencen con el mismo prefijo, generalmente el nombre de la característica. Esto asegurará que las keys no se superpongan, pero aún podrás mantener las keys cerca de donde se utilizan.

Ahora, las Fábricas de Query Keys son un patrón decente, ya que te ayudan a evitar tener que recordar y volver a escribir las keys cada vez que las necesitas. Esto te dará visibilidad al codificar y un poco de seguridad al refactorizar. Sin embargo, tienen un inconveniente: separan la queryKey y la queryFn entre sí.

Como hemos aprendido antes, la queryKey y la queryFn son un par inseparable, ya que la queryKey define las dependencias que se necesitan dentro de la queryFn. Al separarlas, creas una capa de abstracción que podría dificultar el seguimiento más adelante.

Para resolver esto, ¿qué pasaría si llevamos el concepto de Fábricas de Query Keys al siguiente nivel, creando en su lugar Fábricas de Queries (Query Factories)?

Ya hemos visto un poco de este patrón anteriormente cuando hablamos de prefetching (precarga).

Como recordatorio, necesitábamos usar las mismas opciones tanto para queryClient.prefetchQuery como para useQuery. Lo hicimos extrayendo el objeto de opciones a una función creadora (maker function) que luego podíamos invocar cuando necesitábamos el objeto de opciones.


function getPostQueryOptions(path) {
  return {
    queryKey: ['posts', path],
    queryFn: () => fetchPost(path),
    staleTime: 5000
  }
}

...

function usePost(path) {
  return useQuery(getPostQueryOptions(path))
}

...

<a
  onClick={() => setPath(post.path)}
  href="#"
  onMouseEnter={() => {
    queryClient.prefetchQuery(getPostQueryOptions(post.path))
  }}
>
  {post.title}
</a>


La idea de las Fábricas de Queries (Query Factories) es combinar este patrón con el patrón de Fábricas de Query Keys anterior, de modo que tengamos un solo objeto que no solo contenga nuestras queryKeys, sino también el objeto de opciones de la query.


const todoQueries = {
  all: () => ['todos'],
  allLists: () => [...todoQueries.all(), 'list'],
  list: (sort) => ({
    queryKey: [...todoQueries.allLists(), sort],
    queryFn: () => fetchTodos(sort),
    staleTime: 5 * 1000,
  }),
  allDetails: () => [...todoQueries.all(), 'detail'],
  detail: (id) => ({
    queryKey: [...todoQueries.allDetails(), id],
    queryFn: () => fetchTodo(id),
    staleTime: 5 * 1000,
  }),
}


Ahora tenemos lo mejor de ambos mundos. Todavía puedes crear queryKeys a través de la composición, pero ahora las queryKeys y las queryFns se mantienen juntas.

Y como siempre, aún puedes personalizar las opciones por cada invocación de useQuery fusionando el objeto de opciones con cualquier nueva propiedad que desees.


const { data } = useQuery({
  ...todoQueries.list(sort),
  refetchInterval: 10 * 1000,
})


Hay que admitir que lo que hace que este patrón sea un poco incómodo de usar es el hecho de que las diferentes entradas tienen formas distintas. Algunas entradas, como allLists, existen solo para ayudarnos a formar una jerarquía y facilitar la creación de queryKeys para otras entradas, como la queryKey para list. Otras entradas, como list y detail, son objetos de query reales que pueden pasarse a useQuery.

No es un problema masivo, pero solo tienes que estar atento al trabajar con este patrón.

Por ejemplo, ¿puedes detectar el problema en este código?


queryClient.invalidateQueries(todoQueries.allLists())


invalidateQueries requiere un objeto con una propiedad queryKey, pero todoQueries.allLists() devuelve un array.

Aquí está la solución:


queryClient.invalidateQueries({ queryKey: todoQueries.allLists() })


¿Qué hay de este otro?


queryClient.invalidateQueries(todoQueries.detail(id))


Pregunta capciosa, no hay ningún bug. Aunque el objeto que estamos pasando a invalidateQueries contiene algunas propiedades extra, React Query simplemente las ignorará.

Aquí es donde usar TypeScript es útil porque nos dirá cuando estamos haciendo algo mal.


- Para Usuarios de TypeScript:

Para hacer que las Fábricas de Queries (Query Factories) sean seguras en cuanto a tipos, debes usar la función exportada queryOptions de React Query:


import { queryOptions } from '@tanstack/react-query'

list: (sort: string) => queryOptions({
  queryKey: [...todoKeys.allLists(), 'list'],
  queryFn: () => fetchTodos(sort),
  staleTime: 5 * 1000,
})


Esta función asegura que no pases valores incorrectos, como un staletime mal escrito, y también se asegurará de que el QueryFunctionContext, que se pasa a la queryFn, tenga los tipos correctos.

Solución Alternativa (Sin TypeScript)

Y si no puedes usar TypeScript y quieres evitar el problema de las formas diferentes, podrías considerar devolver siempre un objeto desde cada método para mantener la consistencia.


const todoQueries = {
  all: () => ({ queryKey: ['todos'] }), // Devuelve { queryKey: [...] }
  allLists: () => ({
    queryKey: [...todoQueries.all().queryKey, 'list']
  }),
  list: (sort) => ({
    queryKey: [...todoQueries.allLists().queryKey, sort],
    queryFn: () => fetchTodos(sort),
    staleTime: 5 * 1000,
  }),
  allDetails: () => ({
    queryKey: [...todoQueries.all().queryKey, 'detail']
  }),
  detail: (id) => ({
    queryKey: [...todoQueries.allDetails().queryKey, id],
    queryFn: () => fetchTodo(id),
    staleTime: 5 * 1000,
  }),
}


Esto simplifica los valores de retorno, pero hace que la composición sea un poco más verbosa. También necesitarías estar atento a qué valores se pueden pasar a useQuery y cuáles no son objetos de query "reales".