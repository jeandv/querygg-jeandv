// Para este desafío, necesitarás actualizar los siguientes hooks: useBookReviews, useBookQuery, usePrefetchBookById, useFeaturedBooks, useLatestReview, useMyBooks y useSearchQuery para que utilicen una queryFn por defecto. También necesitarás dar a todas las queries de reseñas (reviews) un staleTime de 30 segundos, y el resto de las queries deben usar el staleTime por defecto.

// 🎯 Tareas a Realizar

// Crear una queryFn por defecto para el QueryClient que funcione para todas las queries de tu aplicación.

// Construir una URL para cada llamada a la API usando la queryKey.

// Eliminar la queryFn de todas las llamadas a useQuery en tu aplicación.

// Dar a todas las queries para reseñas (reviews) un staleTime de 30 segundos.