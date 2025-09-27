## Dependent Queries

Hemos estado marcando lentamente todos los diferentes escenarios que encontrarías al obtener datos en una aplicación web real.

Comenzamos obteniendo datos de un endpoint estático, luego introdujimos parámetros dinámicos y después aprendimos a obtener datos a demanda.

Este es el siguiente paso en nuestro recorrido de obtención de datos, y es uno importante: obtener datos que dependen del resultado de otra petición.

Si bien generalmente es mejor ejecutar las consultas en paralelo para minimizar el tiempo que un usuario tiene que esperar a que los datos terminen de cargarse, a veces, esto simplemente no es posible.

Como ejemplo, vamos a obtener información sobre una película y su director. Debido a que encaja convenientemente con lo que estamos tratando de aprender, la API no nos da todo lo que quisiéramos mostrar de inmediato; solo devuelve el id del director, el cual luego tenemos que usar para obtener la información del director.

Sin React Query, así es como se vería obtener esos datos.