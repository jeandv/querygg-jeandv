## Building an Adapter


React Query y el Núcleo Agnosticismo del Framework

React Query es una de las librerías más queridas en el ecosistema de React porque simplifica drásticamente el modelo mental para manejar datos asíncronos.

Sin embargo, a pesar de su gran popularidad, React Query es en realidad solo una capa delgada sobre un núcleo agnóstico al framework llamado TanStack Query. Lo que esto significa es que cualquier librería, no solo React, puede usar TanStack Query para cosechar los beneficios de su simplicidad.

A día de hoy, TanStack Query ya cuenta con adaptadores oficiales para React, Vue, Solid y Svelte, y todos siguen los mismos principios:

Crean un Observer cuando se crea un componente.
Los Observers (Observadores) son el pegamento entre los datos en la caché y el componente del framework. Cada componente necesita su propio Observer durante todo el ciclo de vida del componente.

Se suscriben a los cambios en el Observer.
La QueryCache sirve como centro de operaciones para rastrear los estados de las Queries. Sabe el estado de obtención de la query, qué datos están disponibles y el estado general de la query.
Los Observers pueden suscribirse a cambios para QueryKeys específicos. La caché notifica a estos observadores cada vez que el estado de sus queries suscritas cambia, asegurando que los componentes se mantengan actualizados con la información más reciente de la query.

Aseguran que los componentes actualicen el DOM cuando ocurre un cambio.
La forma exacta en que esto sucede depende del framework que estés utilizando. En React, lo hacemos volviendo a renderizar todo el componente, pero frameworks como Solid lo logran a través de reactividad de grano fino.

Así que, dicho todo esto, pensamos, ¿qué mejor manera de entender cómo funciona React Query bajo el capó que construir tu propio adaptador? ¿Y qué mejor librería para construir uno que un clásico probado y verdadero, jQuery?

😅 Advertencia

Han pasado alrededor de una década desde que escribí una aplicación seria con jQuery, así que aunque este podría no ser el mejor código jQuery que hayas visto, con suerte es lo suficientemente bueno para transmitir los conceptos.

Lo primero que necesitaremos hacer es instalar el paquete independiente @tanstack/query-core, que contiene todas las herramientas de "bajo nivel" que necesitaremos para construir un adaptador.

npm install @tanstack/query-core


A partir de ahí, empecemos con el objetivo final en mente. Aquí está el código jQuery final que intentamos hacer funcionar:

import { QueryClient } from "@tanstack/query-core";

$(document).ready(() => {
  const queryClient = new QueryClient();

  $("#app").useQuery({
    queryClient,
    queryOptions: {
      queryKey: ["repoData", "query"],
      queryFn: async () => {
        console.log("fetching...");
        const { data } = await axios.get(
          "[https://api.github.com/repos/TanStack/query](https://api.github.com/repos/TanStack/query)"
        );
        return data;
      },
      staleTime: 2 * 1000,
    },
    update: (_event, { status, error, data }) => {
      if (status === "pending") {
        $("#app").text("loading...");
      } else if (status === "error") {
        $("#app").text(`Something went wrong: ${error.message}`);
      } else {
        $("#app").text(`${data.name}: ${data.description}`)
      }
    },
  })
})


Cuando nuestro #app esté listo, llamaremos a nuestro widget de jQuery UI personalizado, useQuery, pasándole un queryClient y algunas queryOptions con las que ya estás familiarizado.

Luego, cada vez que el Observer detecte un cambio, llamará a update, actualizando la UI.

Inmersión en Nuestro Adaptador

Ahora vamos a sumergirnos en nuestro adaptador.

Para crear nuestro widget de jQuery UI personalizado, podemos usar $.widget, pasándole el nombre de nuestro widget (useQuery) y dándole un método _create. Puedes pensar en _create como el constructor de nuestro widget.

$.widget("custom.useQuery", {
  _create() {

  }
})


A partir de ahí, necesitamos tomar el queryClient y las queryOptions que se pasaron cuando invocamos $("#app").useQuery({}) e instanciar un nuevo QueryObserver con ellos.

Similar a los props, puedes obtener acceso a queryClient y queryOptions a través de this.options.

import { QueryObserver } from "@tanstack/query-core";

$.widget("custom.useQuery", {
  _create() {
    this._observer = new QueryObserver(
      this.options.queryClient,
      this.options.queryOptions
    );
  }
})


Ahora que tenemos nuestro Observer, lo siguiente que necesitamos hacer es suscribirnos a él para que podamos ser notificados de cualquier cambio. Para hacer eso, podemos llamar al método apropiadamente llamado subscribe.

import { QueryObserver } from "@tanstack/query-core";

$.widget("custom.useQuery", {
  _create() {
    this._observer = new QueryObserver(
      this.options.queryClient,
      this.options.queryOptions
    );

    this._observer.subscribe(() => {
      
    });
  }
})


Al igual que en React, cada vez que nos suscribimos a algo, debemos asegurarnos de cancelar la suscripción para no tener fugas de memoria.

Para cancelar la suscripción de nuestro Observer, podemos llamar al método unsubscribe que devuelve subscribe. Haremos esto dentro del método _destroy de nuestro widget.

import { QueryObserver } from "@tanstack/query-core";

$.widget("custom.useQuery", {
  _create() {
    this._observer = new QueryObserver(
      this.options.queryClient,
      this.options.queryOptions
    );

    this._unsubscribe = this._observer.subscribe(() => {
      
    });
  },
  _destroy() {
    this._unsubscribe();
  }
})


Hasta ahora, todo bien.

Ahora que estamos suscritos a los cambios en nuestro Observer, vamos a hacer algo cuando realmente ocurra un cambio.

Primero, querremos obtener el estado actual de la Query. Para hacer eso, podemos llamar al método getCurrentResult en nuestro Observer.

import { QueryObserver } from "@tanstack/query-core";

$.widget("custom.useQuery", {
  _create() {
    this._observer = new QueryObserver(
      this.options.queryClient,
      this.options.queryOptions
    );

    this._unsubscribe = this._observer.subscribe(() => {
      const result = this._observer.getCurrentResult();
    });
  },
  _destroy() {
    this._unsubscribe();
  }
})


Y ahora que tenemos el estado de la query, necesitamos invocar la callback update que pasamos cuando llamamos a $("#app").useQuery({}) con ese estado.

Para hacer eso, podemos usar la función incorporada de jQuery _trigger, pasándole el nombre del evento (update), el evento en sí (que es irrelevante aquí, así que simplemente le pasaremos null), y cualquier dato que queramos pasar (en este caso, el result).

import { QueryObserver } from "@tanstack/query-core";

$.widget("custom.useQuery", {
  _create() {
    this._observer = new QueryObserver(
      this.options.queryClient,
      this.options.queryOptions
    );

    this._unsubscribe = this._observer.subscribe(() => {
      const result = this._observer.getCurrentResult();
      this._trigger("update", null, result);
    });
  },
  _destroy() {
    this._unsubscribe();
  }
})


Ahora, cada vez que nuestro Observer detecte un cambio, llamará a nuestra callback update con el último estado de la query, lo que luego actualizará la UI, ¡genial!

Mejoras Adicionales

En este punto, tenemos un adaptador básico alrededor del núcleo de Query. Con esto, obtendremos re-obtención automática, caching, deduplicación de solicitudes, recolección de basura automática y reintentos.

Sin embargo, hay solo un par de cosas más que podemos añadir para mejorarlo aún más.

1. Montaje del QueryClient

Para suscribirnos a los eventos del navegador que habilitan las re-obtenciones automáticas en windowFocus y reconnect, tenemos que montar nuestro QueryClient.

En React, este es el trabajo de QueryClientProvider. Dado que obviamente no tenemos algo así actualmente, también podemos hacerlo dentro de _create (y la limpieza en la función _destroy).

No importa si esto se llama varias veces: el QueryClient las desduplicará y solo llamará a subscribe una vez.

import { QueryObserver } from "@tanstack/query-core";

$.widget("custom.useQuery", {
  _create() {
    this.options.queryClient.mount() // <- Montaje del cliente
    this._observer = new QueryObserver(
      this.options.queryClient,
      this.options.queryOptions
    );

    this._unsubscribe = this._observer.subscribe(() => {
      const result = this._observer.getCurrentResult();
      this._trigger("update", null, result);
    });
  },
  _destroy() {
    this.options.queryClient.unmount() // <- Desmontaje del cliente
    this._unsubscribe();
  }
})


2. Actualización Dinámica de Opciones

A continuación, necesitamos darle al consumidor de nuestro widget la capacidad de actualizar dinámicamente las queryOptions que pasan. Ahora mismo, si cambiaran dinámicamente una de las opciones, no sucedería nada.

Para hacer esto, podemos usar el método _setOption que proporciona el widget. Este método será llamado cada vez que un consumidor de nuestro widget llame a $("#app").useQuery("option", "queryOptions", newQueryOptions), dándoles la capacidad de intercambiar dinámicamente sus queryOptions.

Cada vez que se llama a _setOption, comprobaremos si la clave es queryOptions y, si lo es, llamaremos al método setOptions en nuestro Observer con las nuevas opciones.

import { QueryObserver } from "@tanstack/query-core";

$.widget("custom.useQuery", {
  _create() { /* ... código de _create ... */ },
  _setOption(key, value) {
    this._super(key, value); // Llama a la implementación base de jQuery UI

    if (key === "queryOptions") {
      this._observer.setOptions(value);
    }
  },
  _destroy() { /* ... código de _destroy ... */ }
})


3. Optimización de Rendimiento (trackResult)

Y finalmente, una pequeña optimización de rendimiento.

Sabemos que la QueryCache informa al Observer sobre cada cambio que ocurre en la query, pero como vimos en la lección de optimización de rendimiento, el observer aún puede decidir no renderizar el componente si el cambio es irrelevante para él. Después de todo, si un campo cambia y al componente no le importa, no tiene sentido avisar al suscriptor.

Esta característica se llama seguimiento de propiedades (property tracking) y está activada por defecto para React Query, pero no para el núcleo de Query ya que algunos frameworks (como Solid) pueden hacerlo por su cuenta.

Si queremos esta optimización también para nuestro adaptador jQuery, necesitamos optar por ella envolviendo el resultado que recibe nuestra callback update con la función trackResult del Observer.

import { QueryObserver } from "@tanstack/query-core";

$.widget("custom.useQuery", {
  _create() {
    this.options.queryClient.mount()
    this._observer = new QueryObserver(
      this.options.queryClient,
      this.options.queryOptions
    );

    this._unsubscribe = this._observer.subscribe(() => {
      const result = this._observer.getCurrentResult();
      this._trigger(
        "update", 
        null, 
        this._observer.trackResult(result) // <- Seguimiento de propiedades activado
      );
    });
  },
  _setOption(key, value) { /* ... código de _setOption ... */ },
  _destroy() {
    this.options.queryClient.unmount()
    this._unsubscribe();
  }
})


Con eso, la callback update ahora solo se llamará si una de las propiedades en el result que se están usando ha cambiado, y nuestro adaptador está completo.

Espero que este experimento haya demostrado la facilidad de construir un adaptador específico para un framework sobre el núcleo de Query.

En esencia, TanStack Query es un enfoque conceptual para gestionar el estado asíncrono. Los principios centrales se mantienen consistentes, variando solo los detalles de la implementación para adaptarse a las características únicas de cada framework.