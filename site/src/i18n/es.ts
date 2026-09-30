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
      about: "Acerca de",
      submit: "Enviar",
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
    heading: "Comparta una habilidad",
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
      heading: "Enviar una habilidad nueva",
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

      imported: (files: number, repo: string, commit: string) =>
        `Se leyó${files === 1 ? "" : "eron"} ${files} archivo${files === 1 ? "" : "s"} ` +
        `de \`${repo}\` en \`${commit}\`.`,

      archiveLabel: "O suba la carpeta de la habilidad como .zip",
      archiveHint: "Se descomprime en su navegador. No se envía a ninguna parte.",

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
        "Un botón en GitHub y luego vuelva y pegue la dirección que le dé. No " +
        "podemos adivinarla: puede cambiarle el nombre a la copia o tenerla en " +
        "otra cuenta.",
      forkCta: "Hacer un fork del registro",
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
        "y elija *create a new branch and start a pull request* en lugar de " +
        "confirmar en `main`." +
        (reserved ? " Esto abre el registro en " : " Esto abre su copia en ") +
        `\`${namespacePath}\`, de modo que el resultado es \`${skillPath}\`.`,
      uploadCta: "Subir la carpeta",
      uploadWaiting:
        "Pegue arriba la dirección de su copia y esto se convierte en un " +
        "enlace. Una dirección adivinada lo llevaría al lugar equivocado.",

      pullRequestTitle: "Abra el pull request",
      pullRequestBody:
        "Si GitHub ya le ofreció uno al final del paso 3, este paso ya está " +
        "hecho. Las verificaciones se ejecutan sobre él, y desde ahí sigue un " +
        "mantenedor.",
      pullRequestCta: "Abrir el pull request",

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
      heading: "Qué significa y qué no significa una publicación aquí",
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
        "le pedirá solo lo que no pudo encontrar. Necesitará una **cuenta de " +
        "GitHub**: es gratuita y es lo que deja constancia de que la habilidad " +
        "es suya.",
      byHand: "Lo que produce, y lo que usted armaría a mano:",
      steps: {
        namespaceTitle: "Póngala en su propio espacio de nombres",
        namespace:
          "`skills/{your-github-username}/{skill-name}/` con un `SKILL.md`, " +
          "más los directorios opcionales `scripts/` y `references/`.",
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
      cta: "Comparta una habilidad",
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
        "dentro de `scripts/`, y de `.mcp.json` cuando una habilidad declara " +
        "servidores MCP. Si no lo ejecutaríamos en nuestra propia máquina, no " +
        "pasa. *Rechazo.*",

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
        "Los archivos dentro de `scripts/`, y `.mcp.json` cuando una habilidad " +
        "declara servidores MCP, **los ejecuta el agente**; el modelo no los " +
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
      marketplace: "Agregue el marketplace, una sola vez",
      install: "Instálela",
      degit: "Solo esta habilidad",
      clone: "Todo el registro",
    },
    copy: "Copiar",
    copied: "Copiado",

    formatNote:
      "En Claude Code, las dos líneas `/plugin` son todo lo que necesita. Las " +
      "habilidades de aquí siguen el formato abierto [Agent Skills](spec), así " +
      "que también funcionan en ChatGPT, Codex, Gemini CLI, Copilot, Cursor y " +
      "otros; esos aceptan una habilidad a la vez, así que use la descarga de arriba.",
    pathsNote:
      "Las rutas de instalación cambian según la herramienta de agente: " +
      "`.claude/skills/`, `.agents/skills/` y otras. Consulte la documentación " +
      "de su herramienta para saber dónde busca.",
    github: "Ver en GitHub",
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
