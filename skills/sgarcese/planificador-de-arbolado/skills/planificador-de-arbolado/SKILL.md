---
name: planificador-de-arbolado
description: Plan de arborización urbana en tres fases a partir del portal de datos abiertos de una ciudad y su conector OpenContext, priorizando lo que el conector entrega directamente. Produce un inventario de los datos del portal útiles para una gestión basada en la naturaleza, con sus vacíos; un ranking de oportunidad de siembra por distrito, comuna o barrio que combina déficit de árboles, cobertura de copa y vulnerabilidad; y una propuesta de especies por barrio basada en el censo arbóreo de la propia ciudad. Úsalo cuando un equipo de medio ambiente o planeación pregunte qué datos abiertos sirven para enverdecer la ciudad, dónde sembrar primero, qué barrios tienen poca sombra y muchas personas mayores, o qué especies sembrar en un barrio, aunque no mencione el conector.
license: MIT
compatibility: >
  Requiere un conector OpenContext (github.com/sgarcese/OpenContext) para el portal
  de datos abiertos de la ciudad, con backend CKAN, Socrata, ArcGIS Hub u
  Opendatasoft. Usa Python con la biblioteca estándar para el script del índice.
  Acceso de red solo a esos servicios y sin credenciales más allá de las del
  conector. Las fuentes fuera del portal se usan solo con permiso del usuario.
metadata:
  civic.category: data-analysis
  civic.category-secondary: planning-land-use
  civic.scope: municipal
  civic.language: es-419
  civic.localization: generalized
  civic.data-sensitivity: none
  civic.human-review: none
  civic.use-when: >
    Una ciudad con portal de datos abiertos y conector OpenContext quiere saber
    qué datos tiene para una gestión basada en la naturaleza, en qué distritos o
    barrios sembrar primero según déficit de árboles, copa y vulnerabilidad, y
    qué especies proponer por tipo de sitio a partir de su propio censo arbóreo.
  civic.avoid-when: >
    Ciudades sin censo arbóreo en el portal: solo se puede hacer el inventario.
    No reemplaza la evaluación en campo de un arborista ni la validación de
    especies por la autoridad ambiental; la clasificación de origen es
    provisional. No usar con registros sociales o de salud de personas
    individuales. Árboles y copa aproximan la sombra, no miden temperatura.
  civic.maintainer: Santi Garces
  civic.affiliation: individual
  civic.deployment: none
---

# Planificador de arbolado

Convierte el portal de datos abiertos de una ciudad en tres productos para un equipo de medio ambiente o planeación:

1. Un inventario de los datos del portal que sirven para una gestión basada en la naturaleza, con sus vacíos.
2. Un ranking de oportunidad de siembra por unidad territorial (distrito, comuna o barrio).
3. Una propuesta de arborización por barrio, con especies elegidas a partir de la evidencia de la propia ciudad.

Es un análisis de solo lectura sobre datos públicos agregados. No toma decisiones de siembra.

## Principio: primero el portal, por el conector

El análisis debe poder completarse solo con lo que el conector OpenContext entrega. Cada dato se obtiene por la primera ruta que funcione, en este orden, y cada cifra del producto lleva la etiqueta de su ruta:

| Nivel | Ruta | Etiqueta |
|---|---|---|
| A | Consulta por el conector: `query_data`, `aggregate_data`, `execute_sql`, `query_dataset` según el backend | [conector] |
| B | Atributos tabulares de un conjunto del portal (áreas, nombres de unidad, totales) leídos por el conector, sin geometría | [conector] |
| C | Archivo descargable del mismo portal (GeoJSON, CSV) que el conector lista pero no consulta | [descarga del portal] |
| D | Fuente fuera del portal: geoservicio de la ciudad, oficina nacional de estadística, capas ArcGIS, sensores remotos | [externo] |

Reglas:

- Los niveles A y B bastan para las tres fases. Diseña cada cálculo para que funcione con ellos.
- Usa C solo cuando mejore algo que A y B no pueden dar (por ejemplo, un mapa), y solo si el entorno alcanza el portal.
- Usa D solo si el usuario lo pide o lo aprueba en el momento. Antes de usarla, di qué dato falta y qué ganaría el análisis. Si el usuario no está, no la uses: reporta el vacío.
- Nunca uses un navegador, un puente de archivos ni una carpeta del usuario para rodear un bloqueo de red sin pedir permiso primero.
- Si una fase pierde un componente por falta de datos del portal, termina la fase igual, con el componente omitido y dicho en el informe.

## Configuración

Al empezar, identifica en la lista de herramientas el conector y su backend: las herramientas se llaman `mcp__<conector>__<backend>__<verbo>`. Luego fija, preguntando solo lo que no puedas averiguar en el catálogo:

- **Ciudad y portal:** nombre y URL del portal, para las citas.
- **Unidad de análisis:** ver "Elegir la unidad" más abajo.
- **Umbral de persona mayor:** 60 o 65 años, según lo que publique la ciudad.
- **Autoridad ambiental:** la entidad responsable del arbolado, que valida las especies.
- **Idioma de los productos:** el del usuario; por defecto, español.

Si un identificador de conjunto no aparece en el catálogo, pregúntalo en vez de adivinarlo. Un identificador plausible pero equivocado produce un ranking que parece correcto y no lo es.

## Uso del conector: lo que hay que saber

- **Busca con varios términos en paralelo** y en el idioma del portal. La búsqueda no es exhaustiva, así que explora también por organización o grupo antes de concluir que algo no existe.
- **En CKAN se consulta el recurso, no el conjunto.** Llama a `get_dataset` para obtener los identificadores de recurso. Solo los recursos con DataStore se consultan. Un censo puede venir partido en un recurso por distrito: súmalos todos.
- **Agrega en el servidor.** Un censo arbóreo tiene decenas o cientos de miles de filas; nunca lo pagines por la conversación. Usa `aggregate_data` o `execute_sql` con `GROUP BY`.
- **Cuando el conector muestra solo las primeras filas de un resultado**, empaqueta el resultado en una sola fila: en PostgreSQL, `string_agg(concat(a,'|',b,'|',c), ';')` sobre una subconsulta agrupada. Guarda esa fila en un archivo y sepárala en código.
- **Algunas funciones SQL están bloqueadas por permisos** (por ejemplo `coalesce`). `concat` trata los nulos como texto vacío y suele servir de reemplazo. Si SQL y agregación responden 403, di que no hay agregación en el servidor y trabaja con conjuntos ya agregados del portal.
- **Los números pueden venir como texto.** Convierte con `::numeric` antes de sumar.
- **Un resultado de exactamente 100 o 1.000 filas casi siempre está truncado.** Confirma con un conteo.
- **Socrata:** el parámetro es `soql_query`, el `SELECT` va sin `FROM` y todo agregado necesita `GROUP BY`. **ArcGIS Hub:** solo hay conteos en el servidor y un máximo de 1.000 filas por llamada; un promedio sobre más filas es una muestra y debe decirse. **Opendatasoft:** máximo 100 filas; cuenta con `aggregate_data`.

## Reglas de evidencia

1. Cada cifra se calcula durante la ejecución a partir de un conjunto nombrado, o no aparece. El conocimiento previo puede sugerir dónde buscar, pero nunca aporta una cifra.
2. Registra el año de cada fuente y ponlo junto a cada resultado. El censo arbóreo y la población suelen tener años de diferencia.
3. Usa solo datos agregados. Si un conjunto trae registros sobre personas identificables (visitas domiciliarias, expedientes sociales, historias clínicas), no lo uses aunque responda la pregunta, y di en el informe que se omitió y por qué.
4. Cuando una llamada falle, dilo y cambia de ruta. No presentes una descarga parcial como el conjunto completo.
5. El origen nativo, el carácter invasor y la aptitud de una especie son juicios. Marca como provisional cualquier clasificación que hagas y nombra a la autoridad ambiental o a un botánico local como revisor.

## Elegir la unidad

La unidad de análisis es la que comparten el censo arbóreo y una tabla de población del portal. Así se evita una unión espacial.

1. Revisa el esquema del censo arbóreo: casi siempre trae un campo de distrito, comuna, barrio o localidad.
2. Busca en el portal una tabla de población (proyecciones, estimaciones, censo) con ese mismo campo, idealmente con edades y un indicador socioeconómico.
3. Si los nombres coinciden, esa es la unidad. Normaliza mayúsculas, tildes y espacios antes de unir, y reporta las unidades que no casaron.
4. Si no coinciden, busca en el portal una tabla puente (por ejemplo, sectores censales con un campo de barrio) y agrega la población por ese campo.
5. Solo si nada de lo anterior existe, propón al usuario una unión espacial con geometrías del portal (nivel C). Sin ella, entrega las fases 1 y 3 y di que el ranking de la fase 2 quedó pendiente.

Para un segundo nivel más fino (barrios dentro de distritos, o sectores censales), aplica la misma regla. Si el censo no trae ese nivel, la fase 3 trabaja por distrito.

## Fase 1: Inventario de datos para una ciudad bio-inteligente

Objetivo: una lista estructurada de los conjuntos del portal que sirven para una gestión basada en la naturaleza, y una lista honesta de vacíos.

1. Ubica la autoridad ambiental, la oficina de planeación y los grupos relevantes (estadísticas del catálogo, organizaciones, etiquetas).
2. Busca en paralelo con este paquete de términos, adaptado al idioma del portal:
   - Árboles: arbolado, árboles, censo arbóreo, silvicultura, vivero, siembras, copa, cobertura arbórea / trees, tree inventory, urban forest, canopy, planting
   - Ecología: biodiversidad, áreas protegidas, estructura ecológica, corredores, humedales, fauna / biodiversity, protected areas, wetlands, open space
   - Agua: calidad del agua, ríos, quebradas, acuíferos, inundación, drenaje / hydrography, flood, stormwater
   - Aire, ruido y calor: calidad del aire, ruido, temperatura, calor / air quality, noise, heat
   - Residuos: reciclaje, rellenos / waste, recycling
   - Equidad: estrato, pobreza, población por edad, vulnerabilidad / poverty, population estimates, social vulnerability
3. Para cada candidato registra: título, identificador, publicador, formato, nivel de acceso (A, B, C), fecha de última modificación y cobertura temporal. Una fecha de modificación reciente puede esconder datos que terminan años antes; lee la descripción.
4. Lee el esquema y una fila de muestra de los tres a cinco conjuntos tabulares clave para confirmar los campos que vas a usar. Del censo arbóreo anota: especie (científica y común), unidad territorial, diámetro o tamaño, fecha de siembra, ubicación (andén, parque), estado, campos de daño y de copa si existen, y los valores que marcan sitios vacíos o siembras programadas.
5. Clasifica cada conjunto en seis ejes:

| Eje | Qué responde |
|---|---|
| 1. Estructura ecológica y biodiversidad | Dónde están los sistemas naturales y cómo se conectan |
| 2. Bosque urbano | Qué árboles hay, dónde y en qué estado |
| 3. Agua y soluciones basadas en la naturaleza | Dónde manejar el agua con infraestructura verde |
| 4. Aire, ruido, calor y salud ambiental | Dónde recae el estrés ambiental |
| 5. Metabolismo urbano y territorio rural | Cómo circulan materiales y alimentos |
| 6. Equidad | Quién vive dónde |

6. Revisa esta lista de vacíos y di cuáles cubre el portal: temperatura o islas de calor, cobertura de copa medida, registros de especies, censo arbóreo reciente, población por edad en áreas pequeñas, daños de raíces sobre andenes. Para cada vacío, nombra una fuente externa posible sin usarla.

Producto: la tabla por ejes con el nivel de acceso de cada conjunto, las advertencias de vigencia, los vacíos y tres a cinco análisis que los datos del portal ya permiten.

## Fase 2: Ranking de oportunidad

Objetivo: ordenar las unidades por dónde sembrar importa más, con los componentes que el portal permita calcular.

### Datos por unidad

| Campo | Cómo obtenerlo por el conector |
|---|---|
| `arboles` | Conteo del censo agrupado por el campo de unidad, excluyendo sitios vacíos, siembras programadas y tocones |
| `poblacion` | Tabla de población del portal, año más reciente |
| `area_km2` | Atributo de área de la tabla de límites (acres, millas², m², hectáreas); verifica las unidades con una unidad conocida y convierte |
| `copa_pct` | Solo si el portal publica cobertura de copa o de suelo por unidad; si el censo trae diámetro de copa, calcula el área de copa como suma de π·(d/2)² dividida por el área de la unidad y dilo (es un máximo: ignora el solape entre copas) |
| `vulnerabilidad` | Proporción de población de la unidad en el grupo más vulnerable según una tabla del portal (estratos, pobreza, índice de privación), entre 0 y 1 |

Si la vulnerabilidad viene como tasa (por ejemplo, tasa de pobreza), elige una de dos opciones y dila. La primera, si el portal tiene la tabla a un nivel más fino: calcula la proporción de residentes que viven en subunidades por encima de un umbral publicado, como el 20% de pobreza que usa la oficina de censo de EE. UU. La segunda: reescala la tasa con min-max entre unidades.

Donde haya muchos estudiantes, la pobreza se infla. Si la tabla permite quitar el grupo de 18 a 24 años, hazlo y dilo.

### Índice

```
índice = 100 × (0,35 × déficit_árboles + 0,25 × déficit_copa + 0,40 × vulnerabilidad)
déficit_árboles = 1 − minmax(ln(1 + árboles por 1.000 habitantes))
déficit_copa    = 1 − minmax(% de copa)
```

- `ln(1 + x)` en vez de `ln(x)`, para que una unidad sin árboles registrados no rompa el cálculo. Si todas las unidades tienen el mismo valor en un componente, `minmax` divide por cero: asigna 0 a ese componente y dilo.
- Sin datos de copa en el portal, usa `100 × (0,55 × déficit_árboles + 0,45 × vulnerabilidad)`. Dilo en el informe y no rellenes la copa con una fuente externa sin permiso.
- Calcula también los **árboles por km²** y repórtalos junto a los árboles por habitante. La densidad por km² favorece a las zonas poco pobladas; la de árboles por habitante muestra cuánta sombra hay para la gente que vive allí. Señala las unidades que estén en el tercio alto de una y en el tercio bajo de la otra.
- Como prueba de sensibilidad, recalcula con la densidad como componente adicional, con `déficit_densidad = 1 − minmax(ln(1 + árboles por km²))`: con copa, pesos `0,25 / 0,20 / 0,40 / 0,15` (árboles / copa / vulnerabilidad / densidad); sin copa, `0,40 / 0,45 / 0,15` (árboles / vulnerabilidad / densidad). Reporta si cambia el orden de las primeras cinco unidades.
- Los pesos son un juicio. Dilo, y corre la alternativa que pida el usuario.
- Escribe el cálculo en un script corto con la biblioteca estándar de Python, guardado junto a las tablas, para que el ranking se pueda reproducir.

### Activos de agua y espacio verde

Si las capas de hidrografía o espacio público del portal traen en su tabla un campo de unidad y un área, súmalos por unidad por el conector. Muéstralos como lugares donde conectar la siembra, sin puntuarlos: puntuarlos premiaría a las unidades que ya tienen agua. Si esas capas no traen campo de unidad, lístalas por nombre sin asignarlas.

### Mapa opcional

El producto base de esta fase es una tabla. Construye un mapa solo si el conector o una descarga del portal (nivel C) entrega los límites y el entorno alcanza el archivo. Si hay que traerlos por otra ruta, pregunta antes. Cuando el mapa se haga, que sea una página autónoma con los datos incrustados, relleno intercambiable (índice, vulnerabilidad, árboles por 1.000 habitantes, árboles por km², copa), un panel de detalle por unidad y una nota de método.

### Verificaciones antes de entregar

- El número de unidades coincide con la tabla de población.
- La suma de árboles coincide con el total del censo, menos lo excluido.
- Recalcula a mano los árboles por 1.000 habitantes y por km² de dos unidades.
- La suma de áreas se parece al área oficial de la ciudad.

Producto: la tabla de ranking con sus componentes, la variante con densidad y una nota de método con los pesos, los años y el nivel de acceso de cada dato.

## Fase 3: Propuesta de arborización por barrio

Objetivo: para las unidades prioritarias, qué barrios sembrar primero y con qué especies. Todo se calcula con agregaciones del censo por el conector.

1. **Composición por unidad.** Obtén con una sola consulta agrupada el conteo por unidad y especie. Agrupa las variedades bajo su especie (quita el nombre de cultivar). Calcula individuos, número de especies, las diez más comunes, la diversidad de Shannon (H = −Σ pᵢ ln pᵢ) y la especie más común. Aplica la regla 10-20-30: ninguna especie sobre el 10%, ningún género sobre el 20%, ninguna familia sobre el 30%. Marca cada exceso. El género sale del nombre científico; si el censo no trae familia, asígnala solo a las especies más comunes y márcala como provisional, como el origen.

2. **Origen.** Clasifica las 40 especies más comunes de la ciudad en nativa de la región, nativa del continente o de otro continente, y marca las invasoras según la lista oficial del país o estado si existe. Usa una referencia de la autoridad local si el portal la publica. Si no, clasifica con conocimiento botánico, márcalo como provisional y déjalo para revisión. No clasifiques más allá de las 40.

3. **Evidencia de desempeño en la ciudad.** Usa lo que el censo registre, en este orden:
   - **Daño de raíces**, si el censo trae marcas de andén levantado o daño a infraestructura y de emplazamiento: para árboles en andén o piso duro, compara la tasa de cada especie con el promedio de la ciudad. Reporta solo especies con al menos 100 árboles en piso duro (entre 100 y 300, trátalas como indicativas). Agrupa las nativas en A (sombra con poco daño: tasa de daño ≤ 0,55 × referencia y diámetro de copa promedio > 5 m), B (pequeñas y con poco daño: ≤ 0,35 × referencia y copa ≤ 5 m), C (grandes, con tasa cercana a la referencia) y D (tasa más de 5 puntos porcentuales sobre la referencia: solo parques). Una especie que no encaje en ninguna queda sin grupo y se dice.
   - **Si no hay campos de daño**, dilo como vacío y usa estos indicadores del propio censo: tamaño promedio por especie (diámetro), cuánto la sigue sembrando la ciudad (participación en siembras recientes, por fecha de siembra) y su presencia en la unidad frente al límite del 10%. Asigna especies a tipos de sitio por su tamaño adulto y marca esa asignación como provisional.
   - **Plagas conocidas en la región** (por ejemplo, fresnos frente al barrenador esmeralda) se reportan como conteo de individuos a reemplazar, no como juicio sobre la especie.

4. **Personas mayores y sombra.** Con la tabla de población por edad del portal, calcula por unidad: personas mayores, su proporción y personas mayores por cada 100 árboles. Lista las unidades o barrios con muchas personas mayores y poca sombra: por ejemplo, al menos 400 a 800 personas mayores, ajustado al tamaño de la unidad, y copa bajo 20% o menos de 50 a 60 árboles por 1.000 habitantes. Di qué umbral usaste. Calcula la correlación entre proporción de personas mayores y copa (o árboles por habitante). Si es positiva, porque las personas mayores viven donde ya es más verde, dilo y luego muestra cuántas viven en unidades con poca sombra. Árboles y copa son aproximaciones de la sombra, no temperatura. Si el portal publica temperatura, agrégala; si no, nombra el vacío.

5. **Sitios listos.** Cuenta por unidad los sitios de siembra vacíos que el censo registra. Son los más rápidos de llenar.

6. **Propuesta.** Para los cinco barrios o unidades prioritarios escribe:
   - dos a cuatro especies sugeridas por tipo de sitio (andén angosto o bajo redes, andén amplio o separador, parque o alcorque grande), con preferencia por nativas que la ciudad ya siembra;
   - las especies que no conviene sumar allí porque superan el 10% (o su género el 20%);
   - las invasoras y las especies con plagas que conviene reemplazar al final de su vida útil, con su conteo;
   - los sitios vacíos disponibles y los activos de agua o espacio verde cercanos.

Advertencias que acompañan a las especies: las asociaciones del censo no son una comparación controlada; el tamaño del árbol, el alcorque y la edad pesan. Anota las especies con semillas tóxicas o madera quebradiza antes de recomendarlas cerca de colegios o parques infantiles.

## Estructura del producto

1. **Resumen.** Qué unidades van primero y por qué, con dos o tres cifras.
2. **Inventario de datos** (fase 1), con el nivel de acceso de cada conjunto.
3. **Unidades prioritarias.** Tabla: puesto, unidad, índice, árboles por 1.000 habitantes, árboles por km², copa (si existe), vulnerabilidad, personas mayores, personas mayores por cada 100 árboles.
4. **Personas mayores y sombra.**
5. **Especies por tipo de sitio**, qué no sumar y qué reemplazar.
6. **Notas por barrio** para los cinco primeros.
7. **Método y límites:** pesos, años, nivel de acceso de cada dato, componentes omitidos, la clasificación de origen provisional y los conjuntos omitidos por contener registros individuales.

Entrega el producto escrito como documento. Si el usuario lo pide o los límites están disponibles, agrega el mapa. Guarda las consultas, las tablas intermedias y el script del índice para que otra persona repita el análisis.

Todo producto dice, textualmente o traducido al idioma del producto:

- "Este análisis usa datos públicos agregados. Apoya la planeación; no reemplaza la evaluación en campo de un arborista ni de la autoridad ambiental."
- El año de cada fuente, y que la clasificación de origen de las especies es provisional hasta que la revise la autoridad ambiental.
- Qué componentes del índice o pasos de la fase 3 se omitieron por falta de datos en el portal.
- Cualquier conjunto omitido por contener registros individuales.

## Cuándo no usarlo

- En ciudades sin censo arbóreo en el portal: solo se puede hacer la fase 1.
- Como reemplazo de un arborista o un botánico: el origen y la aptitud de cada especie se confirman localmente.
- Con registros sociales o de salud de personas individuales.