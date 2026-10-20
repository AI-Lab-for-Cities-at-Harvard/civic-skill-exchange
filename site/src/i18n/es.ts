/** Every string the site shows a person, in Spanish.
 *
 *  ==================== FOR THE TRANSLATOR ====================
 *
 *  A value that is not translated yet carries the marker
 *
 *      [es]
 *
 *  in front of the English text, which is greppable and looks wrong on the
 *  page. Translate the value and delete the marker, including the space after
 *  it. `no-untranslated.test.ts` lists what is left and fails while anything
 *  is, so the file is finished exactly when that test is green. The first pass
 *  was drafted by a machine and edited by a native speaker; treat any
 *  awkwardness as a bug worth an issue.
 *
 *  `en.ts` is the contract and the commentary. Every key here sits in the same
 *  group, in the same order, and `es.test.ts` fails if that stops being true —
 *  so a paragraph's rationale, the reason a field is asked for, and the note on
 *  what must not be translated are all readable beside the same key over there,
 *  and are deliberately not copied here. Two copies of a comment is one stale
 *  comment.
 *
 *  What that leaves to say twice:
 *
 *  Four markers are markup inside a string, rendered by `rich()`:
 *
 *      **strong**        emphasis that carries meaning: a warning, a caveat
 *      *emphasis*        emphasis that carries tone
 *      `code`            an identifier: a path, a field name, a place code
 *      [label](name)     a link, whose URL the component supplies
 *
 *  Translate around them. `name` in a link is not a URL and not shown to
 *  anybody — leave it alone, and move the `[label]` to wherever the Spanish
 *  sentence wants it.
 *
 *  A value that is a function takes something the page counted or was given.
 *  Keep every argument, and put them where the sentence needs them. The plural
 *  rules are the function’s business: `${n} skill${n === 1 ? "" : "s"}`
 *  becomes whatever Spanish needs, and the condition may be rewritten.
 *
 *  A value that is `[value, label]` translates the label only. The value is an
 *  enum the schema defines, it is the same in every language, and `es.test.ts`
 *  fails on a translated one.
 *
 *  What is NOT here, deliberately: frontmatter keys, enum values, URLs, file
 *  paths and anything the validator parses. And `docs/` stays in English (ADR
 *  0004 decision 4), which is why the links to it carry `docsEnglish`.
 *
 *  ==========================================================
 */

import { locale } from "./locale";
import type { Strings } from "./strings";

/** A select's or a radio group's choices, as `[value, label]`. */
type Choices = [value: string, label: string][];

export const strings: Strings = {
  vocabulary: {
    missing: "—",

    category: {
      policy: "Políticas Públicas",
      "data-analysis": "Análisis de Datos",
      communications: "Comunicaciones",
      finance: "Finanzas",
      hr: "Recursos Humanos",
      technology: "Tecnología",
      "constituent-services": "Atención Ciudadana",
      "benefits-eligibility": "Beneficios y Elegibilidad",
      "permitting-licensing": "Permisos y Licencias",
      legal: "Asuntos Jurídicos",
      "public-records": "Transparencia y Acceso a la Información",
      operations: "Operaciones y Prestación de Servicios",
      "emergency-public-safety": "Gestión de Emergencias y Seguridad Pública",
      "planning-land-use": "Planificación y Uso del Suelo",
      "ai-tools": "Herramientas de IA",
    },

    scope: {
      any: "Cualquier nivel de gobierno",
      municipal: "Ciudad, condado o municipio",
      regional: "Estado, provincia o región",
      national: "Nacional",
      supranational: "Supranacional",
    },

    language: {
      en: "Inglés",
      es: "Español",
      "es-419": "Español (Latam)",
    },

    sensitivity: {
      none: "Sin datos personales",
      pii: "Datos personales (PII)",
      protected: "Protegidos — régimen legal especial",
    },

    localization: {
      generalized: "Generalizada",
      localized: "Localizada",
    },

    deployment: {
      none: "Sin uso en producción",
      personal: "Uso personal",
      team: "Uso en un equipo",
      organization: "Uso en toda la organización",
    },

    humanReview: {
      none: "Sin efecto sobre derechos ni beneficios",
      "advisory-only": "Informa a una persona; no decide nada",
      "decision-support": "Sirve de insumo para una decisión sobre la que alguien actúa",
    },

    affiliation: {
      government: "Gobierno",
      nonprofit: "Organización sin fines de lucro",
      vendor: "Proveedor",
      academic: "Institución académica",
      individual: "Persona individual",
    },

    tier: {
      reviewed: "Revisada",
      community: "Comunidad",
    },
  },

  questions: {
    "civic.data-sensitivity": {
      question: "¿Qué datos maneja?",
      options: [
        ["none", "Ningún dato personal"],
        ["pii", "Datos personales de personas identificables"],
        ["protected", "Datos de salud, beneficios sociales, migración o justicia penal"],
      ] as Choices,
    },
    "civic.human-review": {
      question: "¿Lo que produce afecta los derechos o los beneficios de alguna persona?",
      options: [
        ["none", "No — no afecta los derechos ni los beneficios de ninguna persona"],
        ["advisory-only", "Informa a una persona, pero no decide nada"],
        ["decision-support", "Sirve de insumo para una decisión sobre la que alguien actúa"],
      ] as Choices,
    },
  },

  units: {
    bytes: "B",
    kilobytes: "KB",
    megabytes: "MB",
  },

  chrome: {
    skipToContent: "Ir al contenido",

    brand: "Civic Skill\u00a0Exchange",
    nav: {
      label: "Principal",
      browse: "Explorar",
      guide: "Guía",
      about: "Acerca de",
      submit: "Subir",
      github: "GitHub",
    },
    docsInEnglish: "en inglés",

    language: {
      label: "Idioma",
    },
    theme: {
      toLight: "Claro",
      toDark: "Oscuro",
      switchToLight: "Cambiar al tema claro",
      switchToDark: "Cambiar al tema oscuro",
    },
    title:
      "Habilidades de agente para el trabajo de gobierno, del sector público y " +
      "de organizaciones sin fines de lucro",
    lede:
      "Una ciudad que resuelve un problema una vez debería poder entregar la " +
      "solución a las siguientes cien ciudades.",

    stats: {
      skills: (n: number) => `**${n}** habilidad${n === 1 ? "" : "es"}`,
      plugins: (n: number) => `**${n}** plugin${n === 1 ? "" : "s"}`,
      reviewed: (n: number) => `**${n}** revisada${n === 1 ? "" : "s"}`,
      community: (n: number) => `**${n}** de comunidad`,
    },
    footer: {
      disclaimer:
        "La inclusión en este registro no constituye un respaldo. Las " +
        "verificaciones automatizadas solo pueden rechazar: que una habilidad " +
        "las apruebe nunca significa que sea segura.",

      meta: (generated: string) =>
        `Catálogo generado el ${generated} · ` +
        "[Código fuente y envíos en GitHub](repo) · [Acerca de este proyecto](about)",

      date: (iso: string) => new Date(iso).toLocaleDateString(locale()),
    },
  },

  results: {
    loading: "Cargando el catálogo…",
    all: (n: number) => `${n} habilidad${n === 1 ? "" : "es"}`,
    some: (shown: number, total: number) => `${shown} de ${total} habilidades`,
    empty:
      "Ninguna habilidad coincide con estos filtros. [Quite los filtros](clear) " +
      "para ver el catálogo completo.",
  },

  submit: {
    heading: "Comparta una habilidad o plugin",
    lede:
      "Complete este formulario y nosotros le daremos la forma correcta. " +
      "Toma unos minutos.",

    prereq:
      "Necesitará una **cuenta de GitHub** para terminar: es gratuita y es lo " +
      "que deja constancia de que la habilidad es suya. [Cree una](signup) si " +
      "no la tiene; toma un par de minutos y después puede volver a esta " +
      "página.",

    modes: {
      label: "¿Qué desea hacer?",
      new: "Agregar una habilidad nueva",
      update: "Actualizar una que ya publicó",
    },

    communityWarn:
      "La habilidad se publicará como habilidad de Comunidad hasta que sea revisada.",

    intake: {
      heading: "Subir una habilidad o plugin nuevo",
      lede:
        "¿Ya tiene una? Suéltela aquí y el resto de esta página se completa " +
        "solo. Si su habilidad vive en su propio repositorio, **Code → " +
        "Download ZIP** en GitHub le da el archivo que debe soltar.",

      repoLabel: "El repositorio de GitHub de su habilidad",
      repoHint:
        "Solo repositorios públicos. Leemos la lista de archivos y SKILL.md, y " +
        "le devolvemos la carpeta para que la suba: la publicación deja " +
        "constancia de dónde vino la copia.",
      repoPlaceholder: "github.com/usted/su-habilidad",
      read: "Leerlo",
      reading: "Leyendo…",

      imported: (files: number, repo: string, commit: string, folder?: string, branch?: string) =>
        `Se ${files === 1 ? "leyó" : "leyeron"} ${files} archivo${files === 1 ? "" : "s"} de ` +
        (folder ? `\`${folder}\` en ` : "") + `\`${repo}\`` +
        (folder && branch ? ` (rama \`${branch}\`)` : "") + ` en \`${commit}\`.`,

      archiveLabel: "O suba la carpeta de la habilidad como .zip",
      archiveHint:
        "También sirve la carpeta de un plugin. Se descomprime en su navegador. " +
        "No se envía a ninguna parte.",

      pasteLabel: "O pegue su SKILL.md",

      archiveResult: (name: string, files: number) =>
        `**${name}** — ${files} archivo${files === 1 ? "" : "s"}.`,
      nothingElse: "No hay nada más que corregir.",
      blocked: "Corrija esto antes de continuar. No se puede corregir más abajo.",
    },

    form: {
      heading: "Sobre la habilidad",

      fromFile: (fields: string) =>
        `Leído de su archivo: ${fields}. Todo lo de abajo ya viene completado ` +
        "donde se pudo; cambie lo que esté mal.",

      fieldNames: {
        namespace: "su nombre de usuario de GitHub",
        name: "el nombre de la habilidad",
        description: "la descripción",
        license: "la licencia",
        "allowed-tools": "las herramientas que necesita",
        metadata: "los datos de abajo",
        "civic.category": "la categoría",
        version: "la versión",
        "civic.category-secondary": "la segunda categoría",
        "civic.scope": "el nivel de gobierno",
        "civic.scope-secondary": "el segundo nivel",
        "civic.jurisdiction": "el lugar para el que está escrita",
        "civic.localization": "qué tan portátil es",
        "civic.language": "el idioma en que está escrita",
        "civic.languages-tested": "los idiomas en que la ha probado",
        "civic.models-tested": "los modelos de IA con que la ha probado",
        "civic.data-sensitivity": "los datos que maneja",
        "civic.human-review": "su efecto sobre las personas",
        "civic.use-when": "cuándo es útil",
        "civic.avoid-when": "cuándo no es útil",
        "civic.maintainer": "quién la mantiene",
        "civic.affiliation": "el tipo de organización",
        "civic.deployment": "cuánto la ha usado",
        "civic.deployed-at": "la organización",
        "civic.deployed-in": "dónde opera",
        "civic.deployed-since": "desde cuándo",
      },

      choose: "Elija…",

      namespaceLabel: "Su nombre de usuario de GitHub",
      namespaceHint:
        "Tiene que coincidir exactamente con su usuario: su habilidad va en una " +
        "carpeta con ese nombre, y solo usted puede escribir ahí.",
      reservedNamespace: (namespace: string) =>
        `\`${namespace}\` es la carpeta propia del Laboratorio, así que esto no ` +
        "tiene que coincidir con su usuario. En cambio, necesita la aprobación " +
        "de un mantenedor, y la publicación lleva el distintivo del Laboratorio.",
      noSuchUser: (login: string) =>
        `No existe un usuario de GitHub llamado ${login}. Se rechaza toda ` +
        "propuesta cuya carpeta no coincida con la cuenta que abre el pull request.",
      badLogin: (login: string) =>
        `\u201c${login}\u201d no es un nombre de usuario de GitHub. Un nombre de ` +
        "usuario solo tiene letras, números y guiones sueltos, como " +
        "`maria-lopez`: es el nombre de su dirección en github.com, no su " +
        "nombre completo ni su correo.",

      nameLabel: "Nombre de la habilidad",
      namePlaceholder: "Explicador de Estado de Permisos",
      nameHint: "Escríbalo como quiera; nosotros ordenamos espacios y mayúsculas.",

      nameSlug: (slug: string) =>
        `Se publica como \`${slug}\`: los nombres van en minúsculas y con ` +
        "guiones en lugar de espacios.",

      descriptionLabel: "Descripción",
      descriptionHint:
        "Lo que hace la habilidad, en un par de oraciones. Esto es lo que lee " +
        "un agente para decidir si la usa.",

      categoryLabel: "Categoría",
      categorySecondaryLabel: "Una segunda categoría, si encaja en otra",
      categorySecondaryNone: "Ninguna — pertenece a un solo lugar",
      categorySecondaryHint:
        "La lista mezcla *para qué* sirve una habilidad con el escritorio en el " +
        "que se usa, así que muchas habilidades pertenecen a dos lugares. Deje " +
        "esto en blanco si la suya no.",

      versionLabel: "Versión, si lleva una",
      versionPlaceholder: "1.0",
      versionHint:
        "Su propio número para ella, como `1.0` o `2.1.3`. Es opcional y nada " +
        "lo verifica: está para que quien la adopte note que no es lo mismo que " +
        "se llevó el año pasado. El registro anota por su cuenta cuándo llegó " +
        "una habilidad y cuándo cambió por última vez.",

      scopeLabel: "¿Para qué nivel de gobierno es?",

      scopeChoices: [
        ["any", "Cualquier nivel de gobierno — no supone nada"],
        ["municipal", "Una ciudad, un condado o un municipio"],
        ["regional", "Un estado, una provincia o una región"],
        ["national", "Un gobierno nacional"],
        ["supranational", "Un organismo por encima del gobierno nacional"],
      ] as Choices,
      scopeSecondaryLabel: "Un segundo nivel, si sirve a dos",
      scopeSecondaryNone: "Ninguno — un solo nivel",

      jurisdictionLabel: "¿Está escrita para un lugar específico?",
      jurisdictionPlaceholder: "US-MA / Boston",
      jurisdictionHint:
        "Solo si la habilidad lleva las reglas, los formularios o los plazos de " +
        "ese lugar: `US-VT`, `US-MA / Boston`, `CA-ON / Toronto`. Si no, déjelo " +
        "en blanco, que es el caso de la mayoría. Un código de país, " +
        "opcionalmente un estado o una provincia y, opcionalmente, una ciudad " +
        "después de una barra.",

      localizationLabel: "¿Está preparada para un solo lugar o funciona en cualquiera?",
      localizationChoices: [
        ["localized", "Preparada para un solo lugar — lleva dentro nuestros formularios, plazos y reglas"],
        ["generalized", "Funciona en cualquier lugar — los detalles locales se extrajeron"],
      ] as Choices,
      localizationNone: "Todavía no lo sé",
      localizationHint:
        "[Qué significa esto](about): una habilidad localizada lleva los " +
        "detalles de una jurisdicción; a una generalizada se los quitaron para " +
        "que otra ciudad ponga los suyos.",

      languageLabel: "¿En qué idioma está escrita?",

      languageChoices: [
        ["en", "Inglés"],
        ["es", "Español"],
        ["other", "Otro idioma — yo daré la etiqueta"],
      ] as Choices,
      languageHint:
        "El idioma del propio `SKILL.md`. No limita quién puede usar la " +
        "habilidad: un modelo lee una habilidad en un idioma y la sigue en " +
        "otro. Sirve para que quien la abra sepa con qué se va a encontrar.",
      languageOtherLabel: "Su etiqueta de idioma",
      languageOtherPlaceholder: "pt-BR",
      languageOtherHint:
        "Una etiqueta BCP 47, no el nombre del idioma: `pt-BR`, `fr`, `de`, " +
        "`es-419`.",

      deploymentLabel: "¿La ha usado?",
      deploymentChoices: [
        ["none", "Todavía no — no la he usado en trabajo real"],
        ["personal", "La uso yo"],
        ["team", "La usa mi equipo"],
        ["organization", "La usa toda mi organización"],
      ] as Choices,
      deploymentHintClaim:
        "Decir que la usa un equipo o una organización es una afirmación sobre " +
        "ellos, así que hacen falta los datos de abajo.",
      deploymentHintPersonal:
        "Usarla usted mismo es una respuesta completa: no hace falta nada más.",

      maintainerLabel: "¿Quién la mantiene?",
      maintainerHint: "Una persona o un equipo — Ciudad de X, Departamento de Innovación.",

      affiliationLabel: "¿Qué tipo de organización?",
      affiliationChoices: [
        ["government", "Gobierno"], ["nonprofit", "Sin fines de lucro"], ["vendor", "Proveedor"],
        ["academic", "Académica"], ["individual", "Solo yo"],
      ] as Choices,
    },

    optional: {
      summary: "Algunos datos opcionales",
      useWhenLabel: "¿Cuándo es útil?",
      avoidWhenLabel: "¿Cuándo no lo es?",
      avoidWhenHint:
        "La única que solo usted puede responder. Una habilidad honesta sobre " +
        "sus límites se adopta más rápido.",
      modelsTestedLabel: "¿Con qué modelos de IA la ha probado?",
      modelsTestedPlaceholder: "Claude Sonnet 5, GPT-5",
      modelsTestedHint:
        "Opcional, y es su propia afirmación. Separados por comas, como usted " +
        "los nombraría. Ayuda a elegir un modelo con el que se sabe que funciona.",
      languagesTestedLabel: "¿En qué idiomas la ha probado?",
      languagesTestedPlaceholder: "en, es",
      languagesTestedHint:
        "Etiquetas separadas por comas, incluida la de arriba — `en, es`. Es su " +
        "propia afirmación: aquí nada la verifica, y la página la muestra como " +
        "algo que usted dijo y no como algo que alguien comprobó.",
      toolsLabel: "Herramientas que necesita",
      toolsPlaceholder: "Read, Grep",
      toolsHint:
        "Separadas por comas. Se conceden sin preguntarle a quien la ejecuta, " +
        "así que enumere lo mínimo que necesita.",
      licenseLabel: "Licencia",
      deployedAtLabel: "¿Qué organización la usa?",
      deployedAtHint:
        "Déjelo en blanco si es solo usted: el uso personal no nombra ninguna organización.",
      deployedInLabel: "¿Dónde opera esa organización?",
      deployedInPlaceholder: "US-MA / Boston",
      deployedInHint: "Como US-MA / Boston.",
      deployedSinceLabel: "¿Aproximadamente desde cuándo?",
      deployedSincePlaceholder: "2026-03",
    },

    send: {
      heading: "Envíela",

      addedSummary: (lines: number) =>
        `Lo que agregamos a su SKILL.md — ${lines} línea${lines === 1 ? "" : "s"}`,
      addedNote:
        "Se escribió en la copia que le entrega esta página. Su archivo " +
        "original en el disco sigue sin tenerlo.",

      findingsNote: (n: number) =>
        `Queda${n === 1 ? "" : "n"} ${n} cosa${n === 1 ? "" : "s"} por ` +
        `completar, marcada${n === 1 ? "" : "s"} arriba. Puede enviarla de ` +
        "todos modos: las verificaciones que cuentan se ejecutan después, y " +
        "entonces podrá corregir.",

      multiFileNote: (files: number) =>
        `Su habilidad tiene ${files} archivos. GitHub acepta una carpeta ` +
        "entera, pero solo desde su propia página de carga, así que los " +
        "últimos pasos ocurren allí, con la carpeta que le devuelve esta página.",

      folderTitle: "Lleve la carpeta corregida",
      folderBody:
        "Sus archivos, sin cambios, con las respuestas de arriba escritas en " +
        "`SKILL.md`. Esta carpeta — no la original — es la que se sube: las " +
        "respuestas existen solo en esta copia. Descomprímala primero.",

      downloadFolder: (folder: string) => `Descargar ${folder}.zip`,

      forkTitle: "Haga su propia copia del registro",
      forkBody:
        "Un fork es su propia copia del intercambio en GitHub. Los cambios que " +
        "haga allí no afectan a nadie más hasta que pida que se agreguen, que " +
        "es el pull request del paso siguiente. " +
        "Un botón en GitHub y luego vuelva y pegue la dirección que le dé. No " +
        "podemos adivinarla: puede cambiarle el nombre a la copia o tenerla en " +
        "otra cuenta.",
      forkCta: "Hacer un fork del registro",
      forkMore: "¿Qué es un fork?",
      forkLabel: "La dirección de su copia",
      forkPlaceholder: "github.com/usted/civic-skill-exchange",
      forkHint:
        "Péguela desde la barra de direcciones de su navegador, o escriba propietario/nombre.",
      forkUnparsed:
        "Eso no parece un repositorio de GitHub. Debería ser algo como " +
        "`github.com/usted/civic-skill-exchange`.",

      uploadTitle: "Arrastre la carpeta",

      uploadBody: (
        folder: string, reserved: boolean, namespacePath: string, skillPath: string,
      ) =>
        `Suelte la carpeta completa que **descargó** en el paso 1: ` +
        `descomprimida, con el nombre \`${folder}\`, con subcarpetas y todo. ` +
        "No la abra antes: GitHub conserva el nombre de la carpeta, que es lo " +
        "que hace que caiga en el lugar correcto. Luego use **Commit changes** " +
        "y elija " +
        (reserved
          ? "*create a new branch and start a pull request* en lugar de " +
            "confirmar en `main`."
          : "*commit directly to the `main` branch*, es decir, confirmar " +
            "directamente en la rama `main`. Es su propia copia, así que nada " +
            "se ve afectado hasta el pull request del paso siguiente.") +
        (reserved ? " Esto abre el registro en " : " Esto abre su copia en ") +
        `\`${namespacePath}\`, de modo que el resultado es \`${skillPath}\`.`,
      uploadCta: "Subir la carpeta",
      commitMore: "¿Qué es un commit?",
      uploadWaiting:
        "Pegue arriba la dirección de su copia y esto se convierte en un " +
        "enlace. Una dirección adivinada lo llevaría al lugar equivocado.",

      pullRequestTitle: "Abra el pull request",
      pullRequestBody:
        "Este botón compara su copia con el registro y le deja abrir el pull " +
        "request. Las verificaciones se ejecutan sobre él, y desde ahí sigue " +
        "un mantenedor.",
      pullRequestCta: "Abrir el pull request",
      pullRequestMore: "¿Qué pasa con un pull request?",

      handoff: "Continuar en GitHub",
      urlTooLong:
        "Esto es demasiado largo para llevarlo en un enlace. Cópielo abajo y " +
        "péguelo en GitHub.",
      copy: "Copiar",
      copied: "Copiado",

      emailHandoff:
        "¿No tiene cuenta de GitHub? [Envíenosla por correo](email) y la " +
        "agregamos por usted. Queda a nombre del proyecto y no del suyo, con " +
        "usted acreditado como mantenedor: adjunte el archivo de la habilidad " +
        "y todo lo que necesite.",
      emailTooLong: (address: string) =>
        "Demasiado largo para enviarlo por un enlace de correo. Cópielo arriba " +
        `y envíelo a [${address}](email) con el archivo de la habilidad adjunto.`,

      noAccountPath:
        "Todos los caminos desde aquí pasan por GitHub, así que se necesita " +
        "una cuenta: las verificaciones que admiten una habilidad funcionan " +
        "confirmando que la cuenta que la envió es dueña de la carpeta donde " +
        "quedó. Si eso es un problema, abra un [issue](issues) o pregúntele a " +
        "quien le recomendó esta página; un mantenedor puede enviarla en su " +
        "nombre, y la publicación lo acreditará a usted como mantenedor.",

      seeYaml: "Vea lo que se va a agregar",
      commandLine: "O hágalo desde la línea de comandos",
    },

    update: {
      heading: "Actualice una habilidad que ya publicó",
      lede:
        "Elíjala y le mostraremos qué agregar. Usted pega dos líneas en el " +
        "archivo en GitHub, y no cambia nada más.",
      nothingListed: "Todavía no hay nada publicado aquí.",
      pick: "Su habilidad",
      choose: "Elija una publicación…",
      pasteHint:
        "Pegue esto en el bloque `metadata:`, conservando la sangría, y cambie " +
        "el texto.",

      editCta: (id: string) => `Editar ${id} en GitHub`,
      notFinding:
        "¿No la encuentra? Aquí solo aparecen habilidades que ya están en este " +
        "catálogo. Si la suya todavía no está publicada, [envíela primero como " +
        "habilidad nueva](new).",
    },

    plugin: {
      heading: "Sobre el plugin",
      summary: (name: string, skills: number, servers: number) =>
        `**${name}** es un plugin de ${skills} habilidad${skills === 1 ? "" : "es"}` +
        (servers === 0
          ? ", que no se conecta a ningún servidor MCP."
          : `, que se conecta a ${servers} servidor${servers === 1 ? "" : "es"} MCP.`),
      skillsLabel: "Sus habilidades",
      serversLabel: "A qué se conecta",
      remoteServer: (name: string, host: string) => `**${name}** — \`${host}\``,
      localServer: (name: string, command: string) =>
        `**${name}** — ejecuta \`${command}\` en el equipo donde se instala`,
      reviewed:
        "Un mantenedor revisa cada plugin antes de publicarlo. Sus servidores y " +
        "scripts se ejecutan para quien lo instale, así que una persona los lee primero.",

      youExample: "su-usuario",
      fromFile: (fields: string) =>
        `Leído de plugin.json: ${fields}. Cambie lo que no sea correcto: si otra ` +
        "persona escribió el plugin y usted lo va a mantener, ponga su propio nombre.",
      maintainerLabel: "¿Quién lo mantiene?",
      deploymentLabel: "¿Lo ha usado?",
      versionHint:
        "Su propio número para él, como `1.0` o `0.3.4`. Es opcional y nada lo verifica.",
      downloadWhy: "Escriba arriba su nombre de usuario de GitHub y la descarga estará lista.",

      nameLabel: "Nombre del plugin",
      nameHint: (manifestName: string) =>
        `Su carpeta en el intercambio. Dentro de plugin.json lo llamamos ` +
        `\`${manifestName}\` por usted: es el nombre que instalan Claude Code y Codex.`,
      descriptionHint:
        "Lo que hace el plugin en conjunto. Lo muestran el catálogo, Claude Code y Codex.",
      fitHint:
        "Cuándo conviene el plugin en conjunto y cuándo no. Lo que conviene a " +
        "cada habilidad se queda en su SKILL.md.",

      skillsHeading: "Sus habilidades",
      skillsLede:
        "Cada habilidad guarda sus propias respuestas en su propio SKILL.md. " +
        "Aquí solo se pregunta lo que el archivo deja sin responder.",
      skillComplete: "Completa",
      skillOpen: (n: number) => `${n} por responder`,
      skillOther: "También señalado en el SKILL.md de esta habilidad:",
      fileFindings: (file: string) => `Señalado en ${file}:`,

      multiFileNote: (files: number) =>
        `Su plugin tiene ${files} archivos. GitHub acepta una carpeta entera, ` +
        "pero solo desde su propia página de carga, así que los últimos pasos " +
        "ocurren allí, con la carpeta que le entrega esta página.",
      folderBody:
        "Sus archivos, sin cambios, con las respuestas de arriba escritas en " +
        "`plugin.json` y en el `SKILL.md` de cada habilidad. Esta carpeta, y no " +
        "la original, es la que debe subir: las respuestas solo existen en esta " +
        "copia. Descomprímala primero.",
      addedSummary: (file: string, lines: number) =>
        `Lo que añadimos a ${file}: ${lines} línea${lines === 1 ? "" : "s"}`,

      converted:
        "Este es un plugin exportado desde Claude Code, así que lo reorganizamos " +
        "con la estructura que publica el intercambio, que leen tanto Claude Code " +
        "como Codex: `plugin.json` a partir de `.claude-plugin/plugin.json`, y " +
        "`mcp.json` a partir de `.mcp.json`. Los archivos nuevos están más abajo, " +
        "en “Lo que añadimos”, y sus habilidades no cambian. [La guía](docs) " +
        "explica la estructura.",
      convertedFindings:
        "Lo que se omitió al reorganizarlo. Nada de esto impide la carga, pero " +
        "léalo: un servidor omitido es uno al que el plugin no se conectará.",
      addressLabel: (server: string) => `Dirección pública de ${server}`,
      addressHint:
        "La dirección de este servidor venía de la configuración de su equipo. " +
        "Pegue su dirección pública `https://`.",
      addressPlaceholder: "https://ejemplo.org/mcp",
      addressRefused: (reason: string) => `No pudimos usar esta dirección: ${reason}`,
      addressAdded: (server: string, host: string) =>
        `**${server}** vuelve a estar en \`mcp.json\` y se conecta a \`${host}\`.`,
      conversion: {
        field: (field: string) =>
          `\`${field}\` es un ajuste de Claude Code que Agent Plugins no contempla. ` +
          "El intercambio publica lo que todos los clientes cargan de la misma " +
          "manera —habilidades y servidores MCP—, así que se omitió de `plugin.json`.",
        skillsField:
          "El intercambio solo lee habilidades de `skills/{habilidad}/SKILL.md`, " +
          "así que se omitió de `plugin.json` otra carpeta de habilidades.",
        mcpServersField:
          "Los servidores se leen de `.mcp.json` o de este mismo archivo; este " +
          "ajuste apunta a otro lugar, así que sus servidores no se trasladaron.",
        fromEnvironment: (field: string, value: string) =>
          `\`${field}\` es \`${value}\`, que se completa con la configuración de ` +
          "su equipo. El intercambio no puede verla, así que se omitió.",
        notJson: (file: string, reason: string) =>
          `${file} no es un JSON válido (${reason}), así que no se leyó nada de él.`,
        fileOutside: (path: string) =>
          `\`${path}\` está fuera de \`skills/\`, donde la estructura solo admite ` +
          "`README.md`. Claude Code actúa sobre él sin consultar al modelo, así " +
          "que se omitió. Los scripts y los datos van dentro de la habilidad que los usa.",
        serverUrl: (server: string, url: string) =>
          `**${server}** se conecta a \`${url}\`, una dirección que se completa con ` +
          "la configuración de su equipo. Quien revisa tiene que ver adónde se " +
          "conecta un servidor, así que se omitió de `mcp.json`. Pegue abajo su " +
          "dirección `https` para publicarlo.",
        serverHeader: (server: string, header: string, value: string) =>
          `**${server}** envía el encabezado \`${header}\` como \`${value}\`, que ` +
          "se completa con la configuración de su equipo, así que se omitió el " +
          "encabezado. Nunca escriba una clave ni una contraseña en `mcp.json`: " +
          "se publica con el plugin.",
        serverPluginRoot: (server: string, field: string) =>
          `**${server}** ejecuta un programa mediante \`\${CLAUDE_PLUGIN_ROOT}\` en ` +
          `su \`${field}\`, una carpeta que solo completa Claude Code, así que se ` +
          "omitió de `mcp.json`.",
        serverCommand: (server: string, field: string, value: string) =>
          `**${server}** tiene \`${value}\` en su \`${field}\`, que se completa con ` +
          "la configuración de su equipo, así que se omitió de `mcp.json`.",
        serverEnv: (server: string, key: string, value: string) =>
          `**${server}** asigna \`${value}\` a \`${key}\`, que se completa con la ` +
          "configuración de su equipo, así que se omitió ese ajuste. Quien " +
          "instale el plugin lo configura por su cuenta.",
        serverField: (server: string, field: string) =>
          `**${server}** tiene \`${field}\`, que Agent Plugins no define para este ` +
          "tipo de servidor, así que se omitió de `mcp.json`.",
      },
    },

    problems: {
      notARepo:
        "Eso no parece un repositorio de GitHub. Pegue su dirección, como " +
        "github.com/usted/su-habilidad.",
      notFound:
        "No hay ningún repositorio público ahí. Si es privado, descárguelo y " +
        "suba el zip.",
      rateLimited:
        "GitHub está limitando las solicitudes anónimas desde aquí. Espere " +
        "unos minutos o suba el zip.",
      tooBig:
        "Ese repositorio tiene demasiados archivos para leerlo así. Suba la " +
        "carpeta de la habilidad como zip.",
      noSkillMdInRepo:
        "No hay un SKILL.md en la raíz de ese repositorio. Una habilidad es " +
        "una carpeta con un SKILL.md dentro.",
      offline: "No se pudo conectar con GitHub. Revise su conexión o suba el zip.",

      noSkillMdInZip:
        "No hay un SKILL.md en la raíz del archivo comprimido. Una habilidad " +
        "es un directorio con SKILL.md en su nivel superior.",
      notAZip: "No se pudo leer este archivo como un archivo zip.",
      clientFileLeftOut: (path: string) =>
        `${path} — el intercambio crea este archivo por usted, así que se omitió.`,

      pathEscape: (path: string) =>
        `${path} — la ruta se sale del directorio de la habilidad, así que se omitió.`,
      fileTooBig: (path: string, kb: number, capKb: number) =>
        `${path} — demasiado grande: ${kb} KB. El límite es de ${capKb} KB por archivo.`,
      archiveTooBig: (capMb: number) =>
        `El archivo comprimido declara más de ${capMb} MB sin comprimir, que ` +
        "está por encima del límite para una habilidad completa.",

      noFrontmatter:
        "Esto no empieza con un bloque ---, así que todavía no hay nada que leer.",
      emptyFrontmatter: "El bloque --- está vacío.",
      noFrontmatterToAmend:
        "Este archivo no empieza con un bloque ---, así que no hay nada que modificar.",
      invalidYaml: (reason: string) => `El bloque --- no es YAML válido: ${reason}`,
      invalidPluginJson: (reason: string) => `plugin.json no es un JSON válido: ${reason}`,
    },
  },

  /** NOT TRANSLATED, AND NOT TO BE. The mail goes to a maintainer who reads
   *  English and opens the pull request from it, so `submit.ts` composes it off
   *  the English table explicitly rather than off the reader's locale. These
   *  entries exist because a locale has to fill every key; they are never
   *  rendered. */
  email: {
    subject: (name: string) => `Skill submission: ${name}`,

    noName: "untitled",
    noMaintainer: "(name)",
    noLogin: "(username)",
    body: (maintainer: string, login: string, yaml: string) =>
      "A skill for the Civic Skill Exchange.\n\n" +
      `From: ${maintainer}\n` +
      `GitHub: ${login}\n\n` +
      `${yaml}\n` +
      "The skill body and any scripts are attached.\n",
  },

  errors: {
    catalogUnavailable: "No se pudo cargar el catálogo. Intente recargar la página.",
    loading: "Cargando…",

    noSuchSkill: (id: string) => `Aquí no hay ninguna habilidad publicada llamada ${id}.`,
    backToCatalog: "Volver al catálogo",
  },

  badges: {
    lab: "Escrita por el AI Lab",

    tier: {
      reviewedTitle:
        "Leída contra la lista de verificación pública de nueve puntos, en esta " +
        "versión exacta. Es constancia de lo que se revisó, no una garantía.",
      communityNote: "solo verificaciones automatizadas",

      reviewedNote: "leída contra la lista de verificación publicada",

      reviewers: (names: string[]) => names.join(" y "),
    },

    localization: {
      generalized: "Los detalles de la jurisdicción se extrajeron a un contexto que usted completa",
      localized: "Lleva las citas legales, los formularios y los plazos de una jurisdicción",
    },

    deployment: {
      selfReported: "Declarado por quien la envió",
      selfReportedSince: (since: string) => `${since} — declarado por quien la envió`,
    },

    sensitivity: {
      protected:
        "Salud, beneficios sociales, migración, justicia penal u otro régimen " +
        "legal especial",
      pii: "Se espera que maneje información de identificación personal",
    },

    beta: {
      label: "Beta",
      summary:
        "El intercambio mismo es nuevo: el vocabulario de categorías, los " +
        "campos de metadatos y los flujos de envío y de revisión todavía están " +
        "cambiando.",
    },
  },

  card: {
    cta: "Ver esta habilidad",
  },

  facets: {
    label: "Filtrar habilidades",

    any: "Cualquiera",
    clear: "Quitar filtros",
    search: {
      label: "Buscar",
      placeholder: "permiso, beneficios, Boston…",
    },
    tier: {
      legend: "Nivel",
      note: "Las publicaciones de Comunidad solo pasaron verificaciones automatizadas.",
    },
    category: { legend: "Categoría" },
    localization: {
      legend: "Portabilidad",
      note: "A las habilidades generalizadas se les extrajeron los detalles de la jurisdicción.",
    },
    scope: {
      legend: "Nivel de gobierno",
      note:
        "Para qué tipo de organismo está escrita una habilidad. El lugar " +
        "específico, cuando lo tiene, aparece en la página de la habilidad.",
    },
    language: {
      legend: "Idioma",
      note:
        "El idioma en que está escrita la publicación. Un modelo lee una " +
        "habilidad en un idioma y la sigue en otro, así que esto no limita " +
        "quién puede usarla.",
    },
    sensitivity: { legend: "Datos que maneja" },
  },

  bands: {
    tiers: {
      heading: "Dos niveles:",
      communityTerm: "Comunidad",
      community:
        "Está bien formada y no tiene ningún defecto mecánico. Se integra una " +
        "vez que pasa las verificaciones de estructura, de propiedad y de firmas.",
      reviewedTerm: "Revisada",
      reviewed:
        "El AI Lab for Cities leyó cada línea de un commit específico contra " +
        "una lista de verificación publicada y puso su nombre en ella. Un solo " +
        "lector, no una auditoría independiente. Queda fijada a un hash de " +
        "contenido, así que cualquier cambio la devuelve a Comunidad.",
    },
    contribute: {
      heading: "¿Ya tiene una de estas?",
      lede:
        "Una ciudad que resuelve un problema una vez debería poder entregar la " +
        "solución a las siguientes cien ciudades. Enviar una habilidad es un " +
        "pull request, o un formulario si prefiere no trabajar en git.",
      guide: "Lea la guía para contribuir",
      security: "Qué verificamos y el modelo de seguridad",
    },
  },

  notices: {
    community: {
      lead: (community: number, total: number) => community === total
        ? "Todas las habilidades de aquí son publicaciones de Comunidad."
        : community === 1
          ? `1 de las ${total} habilidades de aquí es una publicación de Comunidad.`
          : `${community} de las ${total} habilidades de aquí son publicaciones de Comunidad.`,
      body:
        "Eso significa que pasaron las verificaciones automatizadas, no que " +
        "alguien haya leído el código. Las verificaciones automatizadas solo " +
        "pueden rechazar. Lea una habilidad y sus scripts antes de ejecutarla.",
    },
  },

  guide: {
    heading: "Cómo usar el intercambio",
    lede:
      "Cada publicación sigue un estándar abierto: una habilidad es una " +
      "carpeta con un `SKILL.md` que leen Claude, ChatGPT, Codex, Gemini y " +
      "otros, y un plugin reúne varias habilidades con las conexiones de datos " +
      "que usan. Así, una misma publicación sirve en muchas herramientas. Lo " +
      "que cambia es cómo se instala.",
    checked: (iso: string) =>
      `Cada paso se comprobó en el producto el ${
        new Date(iso).toLocaleDateString(locale(), { dateStyle: "long", timeZone: "UTC" })
      }. Si un producto se ve distinto ahora, confíe en el producto.`,
    contents: "En esta página",
    captured: (iso: string) =>
      `Capturas del ${
        new Date(iso).toLocaleDateString(locale(), { dateStyle: "long", timeZone: "UTC" })
      }, en inglés. Los datos personales están difuminados.`,
    figures: {
      claude01: {
        alt: "La página Customize de Claude en la pestaña Skills. El botón + Add está arriba a la derecha.",
        caption: "Customize y luego Skills.",
      },
      claude02: {
        alt: "El menú + Add abierto, con Upload skill arriba.",
        caption: "+ Add y luego Upload skill.",
      },
      claude04: {
        alt: "La página Upload a skill con el .zip elegido, una vista previa del nombre y la descripción de la habilidad, y el botón Upload.",
        caption: "La habilidad leída del .zip, lista para subir.",
      },
      chatgpt01: {
        alt: "El panel Customize de ChatGPT en Skills, con el botón Add arriba a la derecha.",
        caption: "Plugins y luego Skills.",
      },
      chatgpt02: {
        alt: "El menú Add abierto, con Upload from your computer abajo.",
        caption: "Add y luego Upload from your computer.",
      },
      gemini01: {
        alt: "La barra lateral de Gemini con More abierto, mostrando Customize.",
        caption: "More y luego Customize.",
      },
      gemini02: {
        alt: "La página Customize de Gemini en la pestaña Skills, con el menú Create abierto y Upload abajo.",
        caption: "Skills, luego Create y luego Upload.",
      },
    },

    install: {
      heading: "Instalar una habilidad",
      lede:
        "La página de cada habilidad tiene un botón de **descarga** que le da " +
        "la habilidad como `.zip`, que es lo que piden la mayoría de las " +
        "herramientas. Busque la que usa:",
      products: {
        claude: {
          heading: "En Claude (claude.ai, la app de escritorio y Cowork)",
          steps: [
            "En la página de la habilidad, **descargue** el `.zip`.",
            "En Claude, abra **Customize** y luego **Skills**.",
            "Haga clic en **+ Add**, luego en **Upload skill**, y elija el " +
              "`.zip`. Claude muestra el nombre y la descripción de la " +
              "habilidad; haga clic en **Upload**.",
          ],
          notes: [
            "Si no aparece la opción de subir, active primero la ejecución de " +
              "código: **Settings → Capabilities**. En un plan Team o " +
              "Enterprise solo un propietario puede activarla, y un " +
              "propietario también puede agregar una habilidad para toda la " +
              "organización de una vez.",
            "Las habilidades funcionan en todos los planes de Claude, incluido " +
              "el gratuito. La que suba también aparece en Claude Code cuando " +
              "inicia sesión allí con la misma cuenta.",
          ],
        },
        claudeCode: {
          heading: "En Claude Code",
          steps: [
            "Agregue el intercambio una vez, con el primer comando de abajo.",
            "Instale cualquier habilidad por su nombre con el segundo. La " +
              "página de cada habilidad muestra su línea exacta, lista para copiar.",
          ],
          notes: [
            "`--sparse` descarga las publicaciones y deja fuera el sitio web y " +
              "las herramientas que las acompañan. Funciona sin él; solo es " +
              "más liviano.",
          ],
        },
        chatgpt: {
          heading: "En ChatGPT",
          steps: [
            "En la página de la habilidad, **descargue** el `.zip`.",
            "En ChatGPT, abra **Plugins** desde la barra de la izquierda y " +
              "luego **Skills**.",
            "Haga clic en **Add**, luego en **Upload from your computer**, " +
              "y elija el `.zip`.",
          ],
          notes: [
            "Las habilidades están en los planes **Business, Enterprise, " +
              "Healthcare y Edu** de ChatGPT, según lo permita su espacio de " +
              "trabajo; no en Free, Plus ni Pro.",
            "ChatGPT revisa cada archivo que se sube. La mayoría queda lista " +
              "enseguida; algunas se marcan como **Needs Review**, y una " +
              "riesgosa queda **Blocked**.",
          ],
        },
        gemini: {
          heading: "En Gemini",
          steps: [
            "En la página de la habilidad, **descargue** el `.zip`.",
            "En **gemini.google.com**, o en la app de Gemini para Mac, abra " +
              "**More**, luego **Customize** y luego la pestaña **Skills**.",
            "Haga clic en **Create**, luego en **Upload**, y elija el `.zip`. " +
              "Si no acepta el `.zip`, descomprímalo y suba la carpeta.",
          ],
          notes: [
            "Por ahora funciona con una cuenta personal de Google, para " +
              "mayores de 18 años con **Keep Activity** activado; todavía no " +
              "con cuentas de trabajo o de estudios, ni en la app del teléfono.",
          ],
        },
        codex: {
          heading: "En Codex y otras herramientas",
          steps: [
            "En la página de la habilidad, **descargue** el `.zip` y " +
              "descomprímalo.",
            "Ponga la carpeta en `.agents/skills/` dentro de su proyecto, o en " +
              "`~/.agents/skills/` para tenerla en todas partes.",
          ],
          notes: [
            "Codex también puede instalar una habilidad por su nombre desde su " +
              "propio marketplace, como Claude Code: [agregue el " +
              "intercambio](marketplaceCodex) una vez.",
            "Otras herramientas: revise dónde busca habilidades la suya. " +
              "`.agents/skills/` en su proyecto también sirve para Gemini CLI y " +
              "Antigravity, y Claude Code lee `.claude/skills/`.",
          ],
        },
      },
    },

    marketplace: {
      heading: "Agregar todo el intercambio",
      lede:
        "Claude Code y Codex pueden agregar el intercambio como **marketplace**: " +
        "todas las publicaciones, instalables por su nombre, con las " +
        "actualizaciones llegándole solas. También es el camino para un " +
        "**plugin**. En ChatGPT Business y Enterprise, un administrador del " +
        "espacio de trabajo puede agregar un marketplace para todos; " +
        "pregúntele al suyo.",
      products: {
        claudeCode: {
          heading: "En Claude Code",
          notes: [
            "Agregue el intercambio y luego instale cualquier habilidad o " +
              "plugin por su nombre. La página de cada publicación muestra su " +
              "línea exacta.",
            "¿Instaló una habilidad de aquí antes de que pasara a la estructura " +
              "de plugins? Su copia sigue funcionando. `claude plugin update " +
              "{namespace}-{skill-name}@civic-skill-exchange` la pone al día; " +
              "reinicie Claude Code para cargarla.",
          ],
        },
        codex: {
          heading: "En Codex",
          notes: [
            "Agregue el intercambio y luego instale cualquier habilidad o " +
              "plugin por su nombre, el mismo que en Claude Code. La página de " +
              "cada publicación muestra su línea exacta. Como en Claude Code, " +
              "`--sparse` descarga solo las publicaciones.",
            "¿Instaló una habilidad de aquí antes de que pasara a la estructura " +
              "de plugins? `codex plugin marketplace upgrade` la pone al día, " +
              "con el mismo nombre.",
          ],
        },
      },
    },

    safety: {
      heading: "Antes de ejecutar nada",
      body: [
        "Lea el `SKILL.md` y todo lo que haya en `scripts/`. Revise " +
          "`allowed-tools`: permite que un asistente use esas herramientas " +
          "**sin pedirle permiso antes**.",
        "Esto vale para toda habilidad de cualquier origen, no solo de este " +
          "intercambio. Nuestras verificaciones automáticas solo pueden " +
          "rechazar; que una habilidad las pase no garantiza que sea segura. " +
          "Una publicación **Revisada** además la leyó una persona. [Cómo " +
          "verificamos](security).",
      ],
    },

    share: {
      heading: "Comparta la suya",
      body:
        "La página para subir lee su habilidad o plugin, pregunta solo lo que " +
        "no pudo encontrar y le guía para ponerlo en GitHub. Necesitará una " +
        "cuenta gratuita de GitHub. Las palabras de abajo son las que va a " +
        "encontrar.",
      cta: "Comparta una habilidad o plugin",
    },

    glossary: {
      heading: "Palabras que verá en GitHub",
      lede:
        "Compartir una publicación ocurre en GitHub, que tiene su propio " +
        "vocabulario. Estas son las cinco palabras, y por qué existe cada paso.",
      words: {
        fork: {
          term: "Fork",
          meaning:
            "Un fork es su propia copia del intercambio en GitHub. Los cambios " +
            "que haga allí no afectan a nadie más hasta que pida que se " +
            "agreguen, que es el pull request. Se hace con un botón, una vez.",
        },
        branch: {
          term: "Branch (rama)",
          meaning:
            "Una línea de cambios dentro de una copia. La línea principal de " +
            "su fork se llama `main` y, como el fork es suyo, la página le " +
            "pide poner su habilidad directamente ahí.",
        },
        commit: {
          term: "Commit",
          meaning:
            "Guardar un cambio, con una nota breve de lo que fue. Subir su " +
            "carpeta termina con **Commit changes**: ese es el guardado.",
        },
        pullRequest: {
          term: "Pull request",
          meaning:
            "Pedir que su cambio se agregue al intercambio. Muestra " +
            "exactamente lo que agrega, y es donde responden las " +
            "verificaciones y los mantenedores.",
        },
        review: {
          term: "Revisión",
          meaning:
            "Las verificaciones automáticas corren en cada pull request y " +
            "responden en un comentario, y una persona lo aprueba antes de " +
            "agregarlo. Un mantenedor lee cada plugin completo. **Revisada** " +
            "en una publicación significa más: el Lab leyó esa versión exacta " +
            "y la aprobó.",
        },
      },
    },
  },

  about: {
    toc: {
      label: "En esta página",
      title: "En esta página",

      groups: {
        whatThisIs: "Qué es esto",
        whatToExpect: "Qué esperar",
      },

      sections: {
        "what-this-is": "El registro",
        tiers: "Los dos niveles",
        localization: "Generalizadas y localizadas",
        metadata: "Los metadatos cívicos",
        submitting: "Cómo enviar una",
        checks: "Qué verificamos",
        review: "Qué comprueba una revisión",
        beta: "Qué significa Beta",
      },
    },

    whatThisIs: {
      heading: "Qué es esto",
      lede:
        "Un catálogo abierto de habilidades de agente para uso cívico: " +
        "gobierno, sector público y trabajo sin fines de lucro.",
      skill:
        "Una **habilidad** es un paquete pequeño y portátil de instrucciones " +
        "— y a veces de scripts — que le enseña a un agente de programación " +
        "con IA a hacer bien una sola tarea: explicar en lenguaje claro el " +
        "estado de un permiso, contrastar una solicitud de beneficios con las " +
        "reglas de elegibilidad, convertir una hoja de cálculo presupuestaria " +
        "en un archivo publicado de datos abiertos.",
      standard:
        "Las habilidades siguen el [estándar abierto Agent Skills](spec), de " +
        "modo que funcionan en distintas herramientas en lugar de atarlo a un " +
        "solo proveedor.",
    },

    tiers: {
      heading: "Los dos niveles, y qué significan",
      communityTerm: "Comunidad",
      community:
        "La habilidad está bien formada y no tiene ningún defecto mecánico. Se " +
        "integra una vez que pasa las verificaciones de estructura, de " +
        "propiedad y de firmas.",
      communityWarn:
        "**Esto no es un respaldo.** Las verificaciones automatizadas solo " +
        "pueden decir *no*: aprobarlas es la ausencia de señales conocidas de " +
        "peligro, no la presencia de seguridad. Lea cualquier cosa de este " +
        "nivel antes de ejecutarla.",
      reviewedTerm: "Revisada",
      reviewed:
        "El AI Lab for Cities at Harvard leyó cada línea de un commit " +
        "específico contra una lista de verificación publicada y puso su " +
        "nombre en ella.",
      reviewedWarn:
        "**Un solo lector, y somos nosotros.** Nadie fuera del Laboratorio la " +
        "ha leído, y cuando el Laboratorio además escribió la habilidad, la " +
        "publicación lo dice. Es una afirmación más modesta que la de dos " +
        "lectores de organizaciones distintas, y es una que sí podemos hacer.",
      pinned:
        "La certificación queda fijada a **un solo commit**: el último que " +
        "tocó la habilidad. Si después de eso alguien confirma algún cambio, " +
        "la publicación vuelve automáticamente a Comunidad, de modo que una " +
        "cuenta comprometida no pueda alterar en silencio algo que ya lleva " +
        "nuestra revisión.",
      reviewLink: "Qué comprueba una revisión",
    },

    localization: {
      heading: "Generalizadas y localizadas",
      bound:
        "La mayoría de las habilidades cívicas nacen atadas a un solo lugar. " +
        "Una habilidad de políticas escrita para el estado de Vermont conoce " +
        "las citas legales, los plazos de apelación y los números de " +
        "formulario de Vermont, que es justo lo que la hace útil allí e inútil " +
        "en cualquier otra parte.",

      flow: {
        from: "Habilidad de políticas de Vermont",
        via: "generalizada",
        to: "Habilidad de políticas de Boston",
      },
      both:
        "Una habilidad **localizada** lleva los detalles de una jurisdicción. " +
        "A una **generalizada** se los extrajeron a un contexto que completa " +
        "quien la adopta. Ninguna es mejor, pero generalizar es lo que permite " +
        "que una solución haga el viaje a la segunda ciudad.",

      pair: (generalize: boolean, localize: boolean) =>
        "El viaje no es manual. Dos habilidades de este registro lo hacen: " +
        (generalize && localize
          ? "[generalize](generalize), que extrae los detalles de una " +
            "jurisdicción a un archivo de contexto, y [localize](localize), " +
            "que aplica el contexto de un lugar nuevo a una habilidad generalizada."
          : generalize
            ? "[generalize](generalize)."
            : "[localize](localize), que aplica el contexto de un lugar nuevo a " +
              "una habilidad generalizada, publicada aquí."),
      more: "Lea más sobre cómo generalizar habilidades",
    },

    metadata: {
      heading: "Los metadatos cívicos",
      ordinary:
        "Una habilidad de aquí es una [Agent Skill](spec) común y corriente: " +
        "el mismo `SKILL.md` que funciona en Claude Code, ChatGPT, Codex y los " +
        "demás. Lo que agrega este registro es un bloque `civic.*` dentro de " +
        "`metadata`, que la especificación reserva precisamente para esto.",
      selfReported:
        "Cada campo de abajo lo **declara el propio autor**. El registro " +
        "deriva por su cuenta solo dos cosas: el nivel, del libro de " +
        "certificaciones, y la autoría, del espacio de nombres. Nada de lo que " +
        "escriba un autor puede mover ninguna de las dos.",

      purposeHeading: "Para qué sirve",
      category:
        "Una de una lista cerrada, para que el catálogo se pueda filtrar en " +
        "lugar de buscar. Cerrada a propósito: un campo de texto libre se " +
        "convierte en doce maneras de escribir “permisos”.",
      scope:
        "Para qué tipo de organismo de gobierno está escrita: una ciudad, un " +
        "estado, una agencia nacional. Es neutral respecto del país, porque el " +
        "lugar es un campo aparte. Una habilidad puede servir a dos niveles; " +
        "uno es obligatorio, porque omitirlo no se podría distinguir de querer " +
        "decir *cualquiera*.",
      jurisdiction:
        "El lugar específico, cuando lo hay: `US-VT`, `US-MA / Boston`. Lo " +
        "omite una habilidad que no está atada a un lugar, que son la mayoría; " +
        "y una habilidad `generalized` nunca lo tiene, porque sus detalles se " +
        "extrajeron.",
      localization:
        "Si los detalles locales siguen dentro. Este campo cambia cómo leen la " +
        "habilidad las verificaciones: una URL externa en una habilidad " +
        "`localized` es la habilidad funcionando, y en una `generalized` es un " +
        "resto que quedó.",
      language:
        "El idioma en que está escrito el `SKILL.md`, como una sola etiqueta " +
        "BCP 47: `en`, `es`, `pt-BR`. No limita quién puede usar la habilidad: " +
        "un modelo lee una habilidad en inglés y la sigue en español. Sirve " +
        "para que usted sepa qué va a abrir, y para que el catálogo se pueda " +
        "explorar por idioma. Es obligatorio, porque una etiqueta omitida no " +
        "se podría distinguir de una sin responder.",
      modelsTested:
        "Opcional, y es la afirmación del propio autor sobre con qué modelos de " +
        "IA ha probado la publicación, en texto libre. **Nada lo verifica.** La " +
        "lista del revisor es `models:` en la certificación, y se muestra aparte.",
      languagesTested:
        "Opcional, y es la afirmación del propio autor sobre en qué idiomas ha " +
        "ejercitado la habilidad. **Nada lo verifica.** La lista verificada es " +
        "otro campo en otro archivo — `languages:` en la certificación de " +
        "revisión en `registry/reviewed.yml` — y la página de la habilidad " +
        "mantiene las dos separadas en lugar de fundirlas en un solo distintivo.",

      effectHeading: "Qué le puede hacer a alguien",
      effectLede:
        "Los dos campos que nadie puede responder leyendo el código, y la " +
        "razón por la que existe este registro y no una carpeta de gists.",
      dataSensitivity: "Con qué trabaja la habilidad cuando se ejecuta sobre trabajo real.",
      humanReview:
        "Si lo que produce llega a una decisión sobre los derechos o los " +
        "beneficios de una persona. Una habilidad que redacta una carta y una " +
        "habilidad que alimenta una determinación de elegibilidad son cosas " +
        "muy distintas.",

      fitHeading: "Cuándo encaja y cuándo no",
      useWhen:
        "La situación para la que esta es la herramienta correcta. Texto " +
        "plano; nunca se procesa como markdown.",
      avoidWhen:
        "La mitad más valiosa. Nadie más que el autor puede aportarla, y una " +
        "habilidad honesta sobre sus límites se adopta más rápido que una que " +
        "dice no tener ninguno.",

      standingHeading: "Quién responde por ella",
      maintainer:
        "Una persona o un equipo, y qué tipo de organización son. No hay un " +
        "campo de contacto aparte: el espacio de nombres es una cuenta de " +
        "GitHub, así que un issue o una mención llegan a quien sea su dueño, y " +
        "eso no puede quedar desactualizado por separado de la cuenta.",
      deployment:
        "Si alguien la ha usado de verdad, y dónde. Lo declara el autor, y se " +
        "muestra como tal.",
      source:
        "De dónde vino una copia importada, sellado automáticamente cuando una " +
        "habilidad se lee de un repositorio. El registro guarda el contenido; " +
        "estos campos dejan constancia de su procedencia.",

      schema: "El esquema, que es el contrato",
    },

    submitting: {
      heading: "Cómo enviar una habilidad",
      lede:
        "La [página de envío](submit) hace casi todo esto por usted: suelte " +
        "una carpeta o indíquele un repositorio, y leerá lo que ya está ahí y " +
        "le pedirá solo lo que no pudo encontrar. Un plugin (varias habilidades " +
        "con los servidores MCP que usan) se envía igual, y un mantenedor revisa " +
        "cada uno. Necesitará una **cuenta de " +
        "GitHub**: es gratuita y es lo que deja constancia de que la habilidad " +
        "es suya.",
      installGuide:
        "¿Vino a instalar una publicación en lugar de compartir una? [Cómo " +
        "usar el intercambio](guide) tiene los pasos para cada herramienta.",
      byHand: "Lo que produce, y lo que usted armaría a mano:",
      steps: {
        namespaceTitle: "Póngala en su propio espacio de nombres",
        namespace:
          "`skills/{your-github-username}/{skill-name}/skills/{skill-name}/` " +
          "con un `SKILL.md`, más los directorios opcionales `scripts/` y " +
          "`references/`. El intercambio genera el resto de la publicación " +
          "cuando se integra.",
        frontmatterTitle: "Complete el frontmatter",
        frontmatter:
          "Los seis campos de la especificación Agent Skills, más los " +
          "metadatos `civic.*`: categoría, nivel de gobierno, qué datos maneja " +
          "y si lo que produce afecta los derechos o los beneficios de " +
          "alguien. Esas dos últimas son las preguntas que nadie puede " +
          "responder leyendo su código.",
        pullRequestTitle: "Abra un pull request",
        pullRequest:
          "Las verificaciones automatizadas se ejecutan e informan en un " +
          "comentario. Solo pueden rechazar: que una habilidad las apruebe no " +
          "significa que sea segura.",
      },
      cta: "Comparta una habilidad o plugin",
      guide: "La guía para contribuir",
    },

    checks: {
      heading: "Qué verificamos y qué no",
      what:
        "Cada propuesta pasa por verificaciones automatizadas. Confirman que " +
        "la habilidad está bien formada y que se envió a la carpeta propia de " +
        "su autor, y buscan un conjunto de problemas conocidos: comandos que " +
        "se ejecutan antes de que el modelo haya leído el archivo, acceso " +
        "irrestricto a herramientas y código que va en busca de credenciales.",
      limits:
        "**Estas verificaciones encuentran problemas conocidos. No pueden " +
        "decirle que una habilidad es segura.** Está bien documentado que los " +
        "escáneres de este tipo se pueden evadir, así que un resultado limpio " +
        "solo significa que nada de la lista coincidió.",
      reviewIsDifferent:
        "Una revisión es otra cosa. Alguien lee la habilidad completa y " +
        "comprueba que lo que hace coincide con lo que dice que hace. Esa es " +
        "la pregunta que ningún escáner puede responder, y es la razón por la " +
        "que existe el nivel Revisada.",
      threeThings:
        "Tres cosas que conviene saber antes de ejecutar cualquier habilidad, " +
        "venga de donde venga:",
      scripts: "Las habilidades pueden incluir scripts que su agente *ejecuta*, no solo texto que lee.",
      tools:
        "El campo `allowed-tools` le da a una habilidad acceso a herramientas " +
        "sin preguntarle antes.",
      removal:
        "Quitar una habilidad de este catálogo no se la quita a quien ya la descargó.",
      security: "El modelo de seguridad y cómo reportar un problema",
    },

    review: {
      heading: "Qué comprueba una revisión",
      lede:
        "Una revisión es una persona leyendo la habilidad completa contra una " +
        "lista fija de nueve preguntas, en este orden. Cuatro de ellas son " +
        "rechazos directos y no juicios de valor, y están marcadas.",

      questions: [
        "**¿La descripción coincide con lo que hace la habilidad?** Una " +
        "descripción más amplia que el comportamiento es un hallazgo de " +
        "seguridad, no un problema de estilo: es así como una habilidad " +
        "termina invocándose para trabajo para el que no fue escrita. *Rechazo.*",

        "**¿Ejecutaríamos estos scripts?** Se lee cada línea de cada archivo " +
        "dentro de `scripts/`, y del `mcp.json` de un plugin, que declara los " +
        "servidores que inicia. Si no lo ejecutaríamos en nuestra propia " +
        "máquina, no pasa. *Rechazo.*",

        "**¿Pide más herramientas de las que necesita?** `allowed-tools` " +
        "concede acceso sin preguntarle, y no depende de que usted confíe en " +
        "el espacio de trabajo, así que cada entrada tiene que ser necesaria. " +
        "Un permiso irrestricto de shell se rechaza de plano. *Rechazo.*",

        "**¿A dónde envía lo que sea que envíe?** Todo destino de red tiene " +
        "que estar nombrado, ser esperado y quedar por escrito. El tráfico " +
        "hacia un lugar que el propósito declarado de la habilidad no requiere " +
        "no es algo que haya que preguntarle al autor. *Rechazo.*",

        "**¿Sale de la carpeta que se le entregó?** Credenciales, variables de " +
        "entorno, archivos en otras partes de la máquina.",

        "**¿Le dice al agente que oculte algo?** Instrucciones para ignorar lo " +
        "anterior, para esconder un paso o para omitir algo de lo que le " +
        "informa a usted.",

        "**¿Lo que produce afecta los derechos o los beneficios de alguna " +
        "persona?** Si es así, la habilidad tiene que decirlo en su propio " +
        "resultado, donde lo verá la persona afectada, y no solo en sus " +
        "metadatos, donde lo veremos únicamente nosotros.",

        "**¿Está la licencia, y realmente corresponde?** Una licencia que " +
        "nombra condiciones que el autor no tenía facultad para conceder es " +
        "peor que ninguna.",

        "**¿Funcionaría fuera del lugar del que viene?** Una habilidad soldada " +
        "a los formularios y los plazos de una jurisdicción sigue siendo útil; " +
        "solo tiene que decirlo, para que nadie la adopte esperando otra cosa.",
      ],
      warn:
        "**Esto es constancia de lo que se revisó, no una garantía.** Un " +
        "lector, unos quince minutos, una versión de la habilidad. No es una " +
        "auditoría independiente, no probamos que la habilidad funcione, y " +
        "pasar estas nueve preguntas no significa que una habilidad sea segura " +
        "ni adecuada para su propósito. Lo que sí significa es que alguien la " +
        "miró, y que usted puede ver exactamente qué buscó.",
      checklist: "La lista de verificación completa, con lo que rechaza cada pregunta",
    },

    beta: {
      heading: "Qué significa Beta",
      scope:
        "Esto se refiere al intercambio, no a las habilidades. Lo que " +
        "significa una publicación está explicado arriba y no ha cambiado: las " +
        "verificaciones automatizadas solo pueden rechazar, y una revisión es " +
        "constancia de lo que se revisó y no una garantía. Beta dice algo más " +
        "acotado: que el registro que rodea a esas publicaciones todavía se " +
        "está construyendo, y que usted puede toparse con una inconsistencia " +
        "que es nuestra y no de una habilidad.",
      movingLede: "Lo que está cambiando ahora mismo:",
      moving: [
        "**Las categorías.** Se acaban de rehacer de doce a quince, sobre dos " +
        "ejes. La categoría de una publicación puede volver a cambiar de etiqueta.",

        "**Los campos de metadatos.** Algunos se están eliminando y otros se " +
        "están agregando: para qué nivel de gobierno está escrita una " +
        "habilidad, y cómo se declara una versión.",

        "**El envío.** La ruta por el navegador funciona; los dos caminos que " +
        "la rodean todavía se están asentando, y los mensajes de error todavía " +
        "se están escribiendo para personas y no para revisores.",

        "**La revisión y el retiro.** Ambos procesos existen y cada uno se ha " +
        "ejecutado una vez. Es de esperar que las guías cambien a medida que " +
        "se usen.",
      ],
      migration:
        "Un campo que cambia no invalida una publicación: el validador dice lo " +
        "que necesita una propuesta en el momento en que usted la envía, y los " +
        "mantenedores migran lo que ya está publicado en lugar de pedírselo a " +
        "los autores. Si algo se contradice, eso es un error y vale la pena " +
        "abrir un issue.",
    },

    terms: {
      heading: "Términos",
      inclusion:
        "La inclusión en este registro no constituye respaldo, verificación ni " +
        "garantía alguna sobre la calidad, el funcionamiento, la seguridad o " +
        "la idoneidad de una habilidad para cualquier propósito. Las " +
        "habilidades del nivel Revisada han sido leídas por el AI Lab for " +
        "Cities at Harvard contra una lista de verificación publicada; eso es " +
        "una afirmación sobre un commit específico, no una garantía, y no una " +
        "evaluación independiente. **Usted es responsable de lo que ejecuta.**",
      licensing:
        "La infraestructura del registro se publica bajo licencia MIT. Cada " +
        "habilidad lleva su propia licencia en su frontmatter y sigue siendo " +
        "propiedad de sus autores: revise ese campo antes de usar alguna.",
      affiliation:
        "Un proyecto afiliado al AI Lab for Cities at Harvard. No es una " +
        "publicación oficial ni cuenta con el respaldo de ninguna institución.",
    },
  },

  detail: {
    breadcrumb: "Ruta de navegación",
    catalog: "Catálogo",
    maintainedBy: (who: string) => `Mantenida por ${who}`,

    nudge: "Esta publicación no dice cuándo encaja la habilidad y cuándo no.",
    nudgeCta: "¿La mantiene usted? Agréguelo",

    fit: {
      heading: "Cuándo usarla",
      caveat:
        "Lo escribió quien envió la habilidad, sobre su propio trabajo. Nadie " +
        "lo ha contrastado con lo que la habilidad hace realmente.",
      use: "Úsela cuando",
      avoid: "No la use cuando",
    },

    tools: {
      heading: "Qué puede hacer",

      caveat:
        "Estas herramientas se conceden **sin preguntarle** cuando se invoca " +
        "la habilidad, y la concesión no depende de la confianza en el espacio " +
        "de trabajo. Compruebe que cada una es necesaria para lo que la " +
        "habilidad dice hacer.",
      none: "No declara ninguna herramienta.",
    },

    structure: {
      heading: "Qué contiene",
      caveat:
        "Los archivos dentro de `scripts/` **los ejecuta el agente**; el " +
        "modelo no los " +
        "lee. Léalos antes de ejecutar esta habilidad: las descripciones de " +
        "arriba le dicen lo que dice hacer, y solo el código le dice lo que hace.",

      executed: "se ejecuta",
      source: "Lea el código fuente en GitHub",
    },

    facts: {
      heading: "De un vistazo",
      category: "Categoría",
      categories: "Categorías",
      scope: "Nivel de gobierno",
      scopes: "Niveles de gobierno",
      jurisdiction: "Escrita para",
      localization: "Portabilidad",

      language: "Escrita en",
      modelsTested: "El autor dice haberla probado con",
      modelsTestedNote: "Lo declara el autor. Nadie la ha probado con estos modelos.",
      verifiedModels: "Ejecutada en la revisión con",
      verifiedModelsNote: (reviewers: string) =>
        `Ejecutada por ${reviewers} sobre este commit exacto.`,
      languagesTested: "El autor dice haberla probado en",
      languagesTestedNote:
        "Lo declara el autor. Nadie la ha ejecutado en estos idiomas por nuestra cuenta.",
      verifiedLanguages: "Verificado en la revisión",
      verifiedLanguagesNote: (reviewers: string) =>
        `Confirmado por ${reviewers} sobre este commit exacto.`,

      someReviewer: "el revisor",
      sensitivity: "Datos",
      humanReview: "Afecta a personas",
      license: "Licencia",
      compatibility: "Requiere",
      commit: "Commit",
      source: "Copiada de",
    },

    humanReview: {
      none: "Lo que produce no afecta los derechos, los beneficios ni la situación de nadie.",
      "advisory-only": "Informa a una persona. No determina nada por sí misma.",
      "decision-support":
        "Sirve de insumo para una determinación sobre la que alguien actúa. " +
        "Revise lo que produce.",
    },

    provenance: {
      heading: "Dónde se ha usado",
      note: "Lo declara quien la envió.",
      deployment: "Uso",
      at: "Organización",
      in: "Lugar",
      since: "Desde",
    },
  },

  download: {
    heading: "Use esta habilidad",

    community:
      "**Nadie ha revisado esta habilidad.** Pasó verificaciones " +
      "automatizadas de estructura y de firmas, que solo pueden rechazar: que " +
      "las apruebe no significa que sea segura. Lea el código fuente en GitHub " +
      "antes de ejecutarla, sobre todo lo que esté dentro de `scripts/`.",

    reviewed: (reviewers: string, date: string, selfReviewed: boolean) =>
      `**Revisada${selfReviewed ? " — por su propio autor" : ""}.** ` +
      `Revisión a cargo de ${reviewers}, contra la lista de verificación ` +
      `publicada y sobre este commit exacto${date ? `, el ${date}` : ""}. Eso ` +
      "es una afirmación sobre este contenido, no una garantía." +
      (selfReviewed
        ? " El AI Lab for Cities escribió y revisó esta habilidad. Nadie " +
          "fuera del Laboratorio la ha leído."
        : ""),

    archive: (size: string) => `Descargar la habilidad (${size})`,
    archiveNote:
      "Un zip de esta carpeta. Súbalo donde su herramienta de agente acepte " +
      "habilidades: sin git y sin línea de comandos.",

    commands: {
      claudeMarketplace: "Claude Code: agregue el marketplace, una sola vez",
      claudeInstall: "Claude Code: instálela",
      codexMarketplace: "Codex: agregue el marketplace, una sola vez",
      codexInstall: "Codex: instálela",
      degit: "Solo esta habilidad",
      clone: "Todo el registro",
    },
    copy: "Copiar",
    copied: "Copiado",

    stepByStep:
      "Paso a paso: [Claude](claude) · [ChatGPT](chatgpt) · " +
      "[Gemini](gemini) · [Codex](codex)",
    formatNote:
      "En Claude Code y Codex, las dos líneas del marketplace son todo lo que " +
      "necesita: [qué hacen](claudeCode). Las habilidades de aquí siguen el " +
      "formato abierto [Agent Skills](spec), así que también funcionan en " +
      "ChatGPT, Gemini, Copilot, Cursor y otros; esos aceptan una habilidad a " +
      "la vez, así que use la descarga de arriba.",
    pathsNote:
      "Las rutas de instalación cambian según la herramienta de agente: " +
      "`.claude/skills/`, `.agents/skills/` y otras. Consulte la documentación " +
      "de su herramienta para saber dónde busca.",
    github: "Ver en GitHub",
  },

  plugins: {
    heading: "Plugins",
    intro:
      "Varias habilidades que funcionan juntas y se instalan como una sola, " +
      "con los servidores MCP a los que se conectan. Sus habilidades se " +
      "describen en la página de cada plugin.",
    count: {
      all: (n: number) => `${n} plugin${n === 1 ? "" : "s"}`,
      some: (shown: number, total: number) => `${shown} de ${total} plugins`,
    },
    empty:
      "Ningún plugin coincide con estos filtros. [Quite los filtros](clear) " +
      "para ver todos los plugins.",
    card: {
      cta: "Ver este plugin",
      skills: (n: number) => `${n} habilidad${n === 1 ? "" : "es"}`,
      servers: (n: number) => `${n} servidor${n === 1 ? "" : "es"} MCP`,
      noServers: "Sin servidores MCP",
    },
    detail: {
      fit: {
        caveat:
          "Lo escribió quien envió el plugin, sobre su propio trabajo. Nadie " +
          "lo ha contrastado con lo que el plugin hace realmente.",
      },
      skills: {
        heading: "Habilidades de este plugin",
        caveat:
          "Cada una cumple las mismas reglas que una habilidad publicada por " +
          "separado. Se instalan juntas y se verificaron juntas.",
      },
      servers: {
        heading: "Servidores MCP",
        caveat:
          "**El plugin se conecta a estos servidores al cargarse.** Una " +
          "persona revisora comprueba que cada host sea uno que el propósito " +
          "del plugin necesita; compárelos con las reglas de su propia " +
          "organización antes de instalarlo.",
        none: "Ninguno. Este plugin no se conecta a ningún servidor MCP.",
        remote: "Remoto",
        local: "Se ejecuta en su equipo",
      },
      facts: {
        categories: "Categorías",
        languages: "Idiomas",
        sensitivity: "Datos más sensibles que maneja",
      },
    },
    download: {
      heading: "Use este plugin",
      community:
        "**Un mantenedor revisó este plugin antes de publicarlo.** No tiene " +
        "una certificación del nivel Revisado, y las verificaciones " +
        "automatizadas solo pueden rechazar: que las apruebe no significa que " +
        "sea seguro. Lea el código fuente en GitHub antes de instalarlo, sobre " +
        "todo el `scripts/` de cada habilidad y `mcp.json`.",
      archive: (size: string) => `Descargar el plugin (${size})`,
      archiveNote: "Un zip de esta carpeta, con todas sus habilidades.",
      commands: {
        claudeMarketplace: "Claude Code: agregue el marketplace, una sola vez",
        claudeInstall: "Claude Code: instálelo",
        codexMarketplace: "Codex: agregue el marketplace, una sola vez",
        codexInstall: "Codex: instálelo",
      },
      stepByStep: "[Paso a paso](guide): cómo agregar el intercambio a Claude Code o Codex.",
      formatNote:
        "Los plugins de este sitio siguen el formato abierto [Agent Plugins](spec). " +
        "Las herramientas que reciben una habilidad a la vez pueden usar las " +
        "habilidades incluidas en la descarga.",
    },
    errors: {
      noSuchPlugin: (id: string) => `Aquí no hay ningún plugin publicado llamado ${id}.`,
    },
  },

  history: {
    heading: "Versión e historial",

    when: (iso: string) => new Date(iso).toLocaleDateString(
      locale(), { month: "long", year: "numeric", timeZone: "UTC" }),
    version: "Versión",
    versionAside:
      "— el número que le pone el propio autor. Lo declara él mismo, y no se " +
      "contrasta con nada.",
    firstSeen: "Publicada desde",
    lastChanged: "Último cambio",
    commits: "Veces que cambió",
    commitsAside:
      "— es una cuenta, no una medida. No dice nada sobre si la habilidad está " +
      "bien mantenida: un solo cambio puede significar que está terminada.",
    note:
      "Las fechas vienen del historial de este repositorio, para esta ruta. " +
      "Una habilidad que se movió entre espacios de nombres empieza de nuevo " +
      "aquí, así que una fecha antigua es confiable y una reciente puede " +
      "significar solo que se le cambió el nombre.",
  },
};
