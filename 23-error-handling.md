## Error Handling


Ocasionalmente, ocurren rechazos de Promesas (Promise rejections), y cuando suceden (a pesar de la tendencia natural a querer ignorarlos y esperar lo mejor), generalmente es una buena idea manejarlos de manera apropiada.

Y a pesar de lo que la navegación web moderna pueda hacerte creer, las ruedas de carga infinitas (infinite spinners) no son una estrategia adecuada para el manejo de errores.

La primera línea de defensa, como hemos visto, es lanzar un error (throw) dentro de la queryFn.

De hecho, ya sea que lances un error, llames al método reject para una promesa construida manualmente, o devuelvas el resultado de Promise.reject(), cualquier rechazo de promesa le indica a React Query que ocurrió un error y que debe establecer el status de la query a error.


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


Ahora puede llegar un momento en el que necesites depurar o envolver la respuesta de tu solicitud fetch dentro de tu queryFn. Para hacer esto, podrías sentir la tentación de manejar el error manualmente con catch.


function useRepos() {
  return useQuery({
    queryKey: ['repos'],
    queryFn: async () => {
      try {
        const response = await fetch('https://api.github.com/orgs/TanStack/repos')
        
        if (!response.ok) {
          throw new Error(`Request failed with status: ${response.status}`)
        }

        return response.json()
      } catch (e) {
        console.log("Error: ", e)
      }
    },
  })
}