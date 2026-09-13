/** Every string the site shows a person, in Spanish.
 *
 *  ==================== FOR THE TRANSLATOR ====================
 *
 *  NOT TRANSLATED YET. Every value below is the English text behind the marker
 *
 *      [es]
 *
 *  which is there to be greppable and to look wrong on the page. Translate the
 *  value and delete the marker, including the space after it.
 *  `no-untranslated.test.ts` lists what is left and fails while anything is,
 *  so the file is finished exactly when that test is green.
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
    catalogUnavailable: "[es] The catalog could not be loaded. Try reloading the page.",
    loading: "[es] Loading…",

    noSuchSkill: (id: string) => `[es] No skill called ${id} is listed here.`,
    backToCatalog: "[es] Back to the catalog",
  },

  badges: {
    lab: "[es] Written by the AI Lab",

    tier: {
      reviewedTitle:
        "[es] Read against the published nine-item checklist, at this exact " +
        "version. A record of what was checked, not a warranty.",
      communityNote: "[es] automated checks only",

      reviewedNote: "[es] read against the published checklist",

      reviewers: (names: string[]) => names.join("[es]  and "),
    },

    localization: {
      generalized: "[es] Jurisdiction specifics lifted out into a context you fill in",
      localized: "[es] Carries one jurisdiction's citations, forms and deadlines",
    },

    deployment: {
      selfReported: "[es] Self-reported by the submitter",
      selfReportedSince: (since: string) => `[es] ${since} — self-reported by the submitter`,
    },

    sensitivity: {
      protected:
        "[es] Health, benefits, immigration, criminal justice, or another " +
        "statutory regime",
      pii: "[es] Expected to handle personally identifiable information",
    },

    beta: {
      label: "[es] Beta",
      summary:
        "[es] The exchange itself is new: the category vocabulary, the metadata " +
        "fields and the submission and review workflows are all still changing.",
    },
  },

  card: {
    cta: "[es] View this skill",
  },

  facets: {
    label: "[es] Filter skills",

    any: "[es] Any",
    clear: "[es] Clear filters",
    search: {
      label: "[es] Search",
      placeholder: "[es] permit, benefits, Boston…",
    },
    tier: {
      legend: "[es] Tier",
      note: "[es] Community listings passed automated checks only.",
    },
    category: { legend: "[es] Category" },
    localization: {
      legend: "[es] Portability",
      note: "[es] Generalized skills have jurisdiction specifics lifted out.",
    },
    scope: {
      legend: "[es] Level of government",
      note:
        "[es] What kind of body a skill is written for. The specific place, when " +
        "it has one, is on the skill's own page.",
    },
    language: {
      legend: "[es] Language",
      note:
        "[es] The language the listing is written in. A model reads a skill in " +
        "one language and follows it in another, so this is not a limit on " +
        "who can use it.",
    },
    sensitivity: { legend: "[es] Data touched" },
  },

  bands: {
    tiers: {
      heading: "[es] What a listing here does and does not mean",
      communityTerm: "[es] Community",
      community:
        "[es] Well-formed, and nothing mechanical is wrong with it. Merged once it " +
        "passes structural, ownership and signature checks.",
      reviewedTerm: "[es] Reviewed",
      reviewed:
        "[es] The AI Lab for Cities read every line of one specific commit against " +
        "a published checklist and put its name on it. One reader, not an " +
        "independent audit. Pinned to a content hash, so any change drops it " +
        "back to Community.",
    },
    contribute: {
      heading: "[es] Have one of these already?",
      lede:
        "[es] A city that solves a problem once should be able to hand the " +
        "solution to the next hundred cities. Submitting is a pull request, " +
        "or a form if you would rather not work in git.",
      guide: "[es] Read the contributor guide",
      security: "[es] What we check, and the security model",
    },
  },

  notices: {
    community: {
      lead: (community: number, total: number) => community === total
        ? "[es] Every skill here is a Community listing."
        : community === 1
          ? `[es] 1 of the ${total} skills here is a Community listing.`
          : `[es] ${community} of the ${total} skills here are Community listings.`,
      body:
        "[es] That means automated checks passed — not that anybody read the code. " +
        "Automated checks can only ever reject. Read a skill and its scripts " +
        "before you run it.",
    },
  },

  about: {
    toc: {
      label: "[es] On this page",
      title: "[es] On this page",

      groups: {
        whatThisIs: "[es] What this is",
        whatToExpect: "[es] What to expect",
      },

      sections: {
        "what-this-is": "[es] The registry",
        tiers: "[es] Two tiers",
        localization: "[es] Generalized and localized",
        metadata: "[es] The civic metadata",
        submitting: "[es] How to submit",
        checks: "[es] What we check",
        review: "[es] What a review checks for",
        beta: "[es] What Beta means",
      },
    },

    whatThisIs: {
      heading: "[es] What this is",
      lede:
        "[es] An open catalog of agent skills for civic use — government, " +
        "public-sector and nonprofit work.",
      skill:
        "[es] A **skill** is a small, portable bundle of instructions — and " +
        "sometimes scripts — that teaches an AI coding agent how to do one job " +
        "well: explain a permit status in plain language, check a benefits " +
        "application against eligibility rules, turn a budget spreadsheet into " +
        "a published open-data file.",
      standard:
        "[es] Skills follow the [Agent Skills open standard](spec), so they work " +
        "across tools rather than locking you into one vendor.",
    },

    tiers: {
      heading: "[es] Two tiers, and what they mean",
      communityTerm: "[es] Community",
      community:
        "[es] The skill is well-formed and nothing mechanical is wrong with it. " +
        "Merged once it passes structural, ownership and signature checks.",
      communityWarn:
        "[es] **This is not an endorsement.** Automated checks can only ever say " +
        "*no* — a pass is the absence of known-bad signals, not the presence " +
        "of safety. Read anything from this tier before you run it.",
      reviewedTerm: "[es] Reviewed",
      reviewed:
        "[es] The AI Lab for Cities at Harvard read every line of one specific " +
        "commit against a published checklist and put its name on it.",
      reviewedWarn:
        "[es] **One reader, and it is us.** Nobody outside the Lab has read it, and " +
        "where the Lab wrote the skill as well, the listing says so. It is a " +
        "smaller claim than two readers from separate organizations would be, " +
        "and it is one we can actually make.",
      pinned:
        "[es] The attestation is pinned to **one commit** — the last one that " +
        "touched the skill. If anything commits to it after that, the listing " +
        "drops back to Community automatically, so a compromised account " +
        "cannot quietly alter something already carrying our review.",
      reviewLink: "[es] What a review checks for",
    },

    localization: {
      heading: "[es] Generalized and localized",
      bound:
        "[es] Most civic skills start out bound to one place. A policy skill " +
        "written for the State of Vermont knows Vermont's statute citations, " +
        "appeal windows and form numbers — which is what makes it useful " +
        "there, and useless anywhere else.",

      flow: {
        from: "[es] Vermont policy skill",
        via: "[es] generalized",
        to: "[es] Boston policy skill",
      },
      both:
        "[es] A **localized** skill carries one jurisdiction's specifics. A " +
        "**generalized** one has had them lifted out into a context an adopter " +
        "fills in. Neither is better — but generalizing is what lets a " +
        "solution make the trip to the second city.",

      pair: (generalize: boolean, localize: boolean) =>
        "[es] The trip is not manual. Two skills in this registry do it: " +
        (generalize && localize
          ? "[es] [generalize](generalize), which lifts a jurisdiction's specifics " +
            "out into a context file, and [localize](localize), which applies " +
            "a new place's context to a generalized skill."
          : generalize
            ? "[es] [generalize](generalize)."
            : "[es] [localize](localize), which applies a new place's context to a " +
              "generalized skill, listed here."),
      more: "[es] Read more on generalizing skills",
    },

    metadata: {
      heading: "[es] The civic metadata",
      ordinary:
        "[es] A skill here is an ordinary [Agent Skill](spec) — the same `SKILL.md` " +
        "that works in Claude Code, ChatGPT, Codex and the rest. What this " +
        "registry adds is a `civic.*` block under `metadata`, which the " +
        "specification reserves for exactly this.",
      selfReported:
        "[es] Every field below is **self-reported** by the author. The registry " +
        "derives only two things itself: the tier, from the attestation " +
        "ledger, and authorship, from the namespace. Nothing an author writes " +
        "can move either.",

      purposeHeading: "[es] What it is for",
      category:
        "[es] One of a closed list, so the catalogue can be filtered rather than " +
        "searched. Closed on purpose: a free-text field becomes twelve " +
        "spellings of \u201cpermits\u201d.",
      scope:
        "[es] What kind of government body it is written for — a city, a state, a " +
        "national agency. Country-neutral, because the place is a separate " +
        "field. A skill may serve two levels; one is required, because leaving " +
        "it out could not be told apart from meaning *any*.",
      jurisdiction:
        "[es] The specific place, when there is one: `US-VT`, `US-MA / Boston`. " +
        "Left out by a skill that is not tied to a place, which is most of " +
        "them — and a `generalized` skill never has one, since its specifics " +
        "were lifted out.",
      localization:
        "[es] Whether the local specifics are still in it. This one changes how the " +
        "checks read the skill: an external URL in a `localized` skill is the " +
        "skill working, and in a `generalized` one it is a leftover.",
      language:
        "[es] The language the `SKILL.md` is written in, as one BCP 47 tag — `en`, " +
        "`es`, `pt-BR`. Not a limit on who can use the skill: a model reads an " +
        "English skill and follows it in Spanish. It is so you know what you " +
        "are about to open, and so the catalogue can be browsed by it. " +
        "Required, because an omitted tag could not be told apart from an " +
        "unanswered one.",
      languagesTested:
        "[es] Optional, and the author\u2019s own claim about which languages they " +
        "have exercised the skill in. **Nothing checks it.** The verified list " +
        "is a different field in a different file — `languages:` on the review " +
        "attestation in `registry/reviewed.yml` — and the skill\u2019s page " +
        "keeps the two apart rather than merging them into one badge.",

      effectHeading: "[es] What it might do to somebody",
      effectLede:
        "[es] The two fields nobody can answer by reading the code, and the reason " +
        "this registry exists rather than a folder of gists.",
      dataSensitivity: "[es] What the skill touches when it runs on real work.",
      humanReview:
        "[es] Whether its output reaches a decision about a person\u2019s rights or " +
        "benefits. A skill that drafts a letter and a skill that feeds an " +
        "eligibility determination are different propositions.",

      fitHeading: "[es] When it fits, and when it does not",
      useWhen:
        "[es] The situation this is the right tool for. Plain text, never rendered " +
        "as markdown.",
      avoidWhen:
        "[es] The higher-value half. Nobody but the author can supply it, and a " +
        "skill honest about its limits gets adopted faster than one claiming " +
        "none.",

      standingHeading: "[es] Who stands behind it",
      maintainer:
        "[es] A person or team, and what kind of organization they are. There is no " +
        "separate contact field: the namespace is a GitHub account, so an " +
        "issue or a mention reaches whoever owns it, and that cannot go stale " +
        "independently of the account.",
      deployment:
        "[es] Whether anyone has actually used it, and where. Self-reported, and " +
        "shown as such.",
      source:
        "[es] Where an imported copy came from, stamped automatically when a skill " +
        "is read out of a repository. The registry holds the content; these " +
        "record its provenance.",

      schema: "[es] The schema, which is the contract",
    },

    submitting: {
      heading: "[es] How to submit a skill",
      lede:
        "[es] The [submission page](submit) does most of this for you: drop in a " +
        "folder or point it at a repository, and it reads what is already " +
        "there and asks only for what it could not find. You will need a " +
        "**GitHub account** \u2014 it is free, and it is what records the " +
        "skill as yours.",
      byHand: "[es] What it produces, and what you would build by hand:",
      steps: {
        namespaceTitle: "[es] Put it in your own namespace",
        namespace:
          "[es] `skills/{your-github-username}/{skill-name}/` with a `SKILL.md`, " +
          "plus optional `scripts/` and `references/` directories.",
        frontmatterTitle: "[es] Fill in the frontmatter",
        frontmatter:
          "[es] The six fields of the Agent Skills spec, plus `civic.*` metadata: " +
          "category, level of government, what data it touches, and whether " +
          "its output affects anyone's rights or benefits. Those last two are " +
          "the questions nobody can answer from reading your code.",
        pullRequestTitle: "[es] Open a pull request",
        pullRequest:
          "[es] Automated checks run and report back in a comment. They can only " +
          "reject \u2014 a pass is not a statement that a skill is safe.",
      },
      cta: "[es] Share a skill",
      guide: "[es] The contributor guide",
    },

    checks: {
      heading: "[es] What we check, and what we don\u2019t",
      what:
        "[es] Every submission goes through automated checks. They confirm the " +
        "skill is well formed, that it was submitted into its author\u2019s " +
        "own folder, and they scan for a set of known problems: commands that " +
        "run before the model has read the file, unrestricted tool access, and " +
        "code that reaches for credentials.",
      limits:
        "[es] **These checks find known problems. They cannot tell you a skill is " +
        "safe.** Scanners of this kind are well documented as possible to " +
        "evade, so a clean result means only that nothing on the list matched.",
      reviewIsDifferent:
        "[es] A review is a different thing. Someone reads the whole skill and " +
        "checks that what it does matches what it says it does. That is the " +
        "question no scanner can answer, and it is why the Reviewed tier " +
        "exists.",
      threeThings: "[es] Three things to know before you run any skill, from anywhere:",
      scripts: "[es] Skills can include scripts your agent *runs*, not only text it reads.",
      tools:
        "[es] The `allowed-tools` field gives a skill access to tools without " +
        "asking you first.",
      removal:
        "[es] Removing a skill from this catalog does not remove it from anyone who " +
        "already downloaded it.",
      security: "[es] Security model and how to report a problem",
    },

    review: {
      heading: "[es] What a review checks for",
      lede:
        "[es] A review is one person reading the whole skill against a fixed list " +
        "of nine questions, in this order. Four of them are outright " +
        "rejections rather than judgment calls, and they are marked.",

      questions: [
        "[es] **Does the description match what the skill does?** A description " +
        "broader than the behaviour is a security finding, not a style " +
        "problem — it is how a skill gets invoked for work it was not written " +
        "for. *Rejection.*",

        "[es] **Would we run these scripts?** Every line of every file under " +
        "`scripts/` gets read, and of `.mcp.json` where a skill declares MCP " +
        "servers. If we would not run it on our own machine, it does not " +
        "pass. *Rejection.*",

        "[es] **Does it ask for more tools than it needs?** `allowed-tools` grants " +
        "access without prompting you and is not gated by trusting the " +
        "workspace, so every entry has to be necessary. An unrestricted shell " +
        "grant is refused outright. *Rejection.*",

        "[es] **Where does it send anything?** Every network destination has to be " +
        "named, expected, and written down. Traffic to somewhere the " +
        "skill\u2019s stated purpose does not require is not a question to " +
        "ask the author. *Rejection.*",

        "[es] **Does it reach outside the folder it was given?** Credentials, " +
        "environment variables, files elsewhere on the machine.",

        "[es] **Does it tell the agent to hide anything?** Instructions to " +
        "disregard what came before, to conceal a step, or to leave something " +
        "out of what it reports back to you.",

        "[es] **Does what it produces affect anyone\u2019s rights or benefits?** " +
        "If it does, the skill has to say so in its own output, where the " +
        "person affected will see it — not only in its metadata, where only " +
        "we will.",

        "[es] **Is the license there, and does it actually apply?** A license " +
        "naming terms the author had no standing to grant is worse than none.",

        "[es] **Would it work outside the place it came from?** A skill welded to " +
        "one jurisdiction\u2019s forms and deadlines is still useful; it just " +
        "needs to say so, so nobody adopts it expecting otherwise.",
      ],
      warn:
        "[es] **This is a record of what was checked, not a guarantee.** One " +
        "reader, about fifteen minutes, one version of the skill. It is not an " +
        "independent audit, we do not test that the skill works, and passing " +
        "these nine questions is not a statement that a skill is safe or fit " +
        "for your purpose. What it does mean is that somebody looked, and you " +
        "can see exactly what they looked for.",
      checklist: "[es] The full checklist, with what each question rejects",
    },

    beta: {
      heading: "[es] What Beta means",
      scope:
        "[es] This is about the exchange, not about the skills. What a listing " +
        "means is covered above and has not changed: automated checks can only " +
        "reject, and a review is a record of what was checked rather than a " +
        "guarantee. Beta says something narrower — that the registry around " +
        "those listings is still being built, and you may hit an " +
        "inconsistency that is ours rather than a skill\u2019s.",
      movingLede: "[es] What is moving right now:",
      moving: [
        "[es] **The categories.** Just recut from twelve to fifteen, onto two axes. " +
        "A listing\u2019s category may be relabelled again.",

        "[es] **The metadata fields.** Some are being dropped, others added — what " +
        "level of government a skill is written for, and how a version is " +
        "declared.",

        "[es] **Submitting.** The browser route works; the two paths around it are " +
        "still settling, and error messages are still being written for " +
        "people rather than for reviewers.",

        "[es] **Review and removal.** Both processes exist and each has run once. " +
        "Expect the guides to change as they are used.",
      ],
      migration:
        "[es] A field that changes does not invalidate a listing: the validator " +
        "says what a submission needs at the moment you submit it, and the " +
        "maintainers migrate what is already listed rather than asking authors " +
        "to. If something contradicts itself, that is a bug and worth an issue.",
    },

    terms: {
      heading: "[es] Terms",
      inclusion:
        "[es] Inclusion in this registry does not constitute endorsement, " +
        "verification, or any guarantee regarding a skill's quality, " +
        "functionality, security, or fitness for any purpose. Skills in the " +
        "Reviewed tier have been read by the AI Lab for Cities at Harvard " +
        "against a published checklist; that is a statement about a specific " +
        "commit, not a warranty, and not an independent assessment. **You are " +
        "responsible for what you run.**",
      licensing:
        "[es] Registry infrastructure is MIT licensed. Each skill carries its own " +
        "license in its frontmatter and remains the property of its authors — " +
        "check that field before you use one.",
      affiliation:
        "[es] A project affiliated with the AI Lab for Cities at Harvard. Not an " +
        "official publication, and not endorsed by any institution.",
    },
  },

  detail: {
    breadcrumb: "[es] Breadcrumb",
    catalog: "[es] Catalog",
    maintainedBy: (who: string) => `[es] Maintained by ${who}`,

    nudge: "[es] This listing does not say when the skill fits and when it does not.",
    nudgeCta: "[es] Maintain it? Add that",

    fit: {
      heading: "[es] When to use this",
      caveat:
        "[es] Written by whoever submitted the skill, about their own work. Nobody " +
        "has checked it against what the skill actually does.",
      use: "[es] Use it when",
      avoid: "[es] Don’t use it when",
    },

    tools: {
      heading: "[es] What it can do",

      caveat:
        "[es] These tools are granted **without prompting you** when the skill is " +
        "invoked, and the grant is not gated by workspace trust. Check that " +
        "each one is necessary for what the skill claims to do.",
      none: "[es] No tools declared.",
    },

    structure: {
      heading: "[es] What is in it",
      caveat:
        "[es] Files under `scripts/`, and `.mcp.json` where a skill declares MCP " +
        "servers, are **executed by the agent**, not read by the model. Read " +
        "them before you run this skill — the descriptions above tell you " +
        "what it claims to do, and only the code tells you what it does.",

      executed: "[es] executed",
      source: "[es] Read the source on GitHub",
    },

    facts: {
      heading: "[es] At a glance",
      category: "[es] Category",
      categories: "[es] Categories",
      scope: "[es] Level",
      scopes: "[es] Levels",
      jurisdiction: "[es] Written for",
      localization: "[es] Portability",

      language: "[es] Written in",
      languagesTested: "[es] Author reports testing in",
      languagesTestedNote:
        "[es] Self-reported. Nobody has run it in these languages on our behalf.",
      verifiedLanguages: "[es] Verified in review",
      verifiedLanguagesNote: (reviewers: string) =>
        `[es] Confirmed by ${reviewers} against this exact commit.`,

      someReviewer: "[es] the reviewer",
      sensitivity: "[es] Data",
      humanReview: "[es] Affects people",
      license: "[es] License",
      compatibility: "[es] Requires",
      commit: "[es] Commit",
      source: "[es] Copied from",
    },

    humanReview: {
      none: "[es] Output does not affect any individual's rights, benefits or standing.",
      "advisory-only": "[es] Informs a person. Does not determine anything on its own.",
      "decision-support": "[es] Feeds a determination someone acts on. Review its output.",
    },

    provenance: {
      heading: "[es] Where it has been used",
      note: "[es] Self-reported by the submitter.",
      deployment: "[es] Use",
      at: "[es] At",
      in: "[es] In",
      since: "[es] Since",
    },
  },

  download: {
    heading: "[es] Use this skill",

    community:
      "[es] **Nobody has reviewed this skill.** It passed automated structural and " +
      "signature checks, which can only ever reject — a pass is not a " +
      "statement that it is safe. Read the source on GitHub before you run it, " +
      "particularly anything under `scripts/`.",

    reviewed: (reviewers: string, date: string, selfReviewed: boolean) =>
      `[es] **Reviewed${selfReviewed ? " — by its own author" : ""}.** ` +
      `${reviewers} read this exact commit against the published checklist` +
      `${date ? ` on ${date}` : ""}. That is a statement about this content, ` +
      "not a warranty." +
      (selfReviewed
        ? "[es]  The AI Lab for Cities wrote and reviewed this skill. Nobody " +
          "outside the Lab has read it."
        : ""),

    archive: (size: string) => `[es] Download the skill (${size})`,
    archiveNote:
      "[es] A zip of this folder. Upload it wherever your agent tool takes skills " +
      "— no git, no command line.",

    commands: {
      marketplace: "[es] Add the marketplace, once",
      install: "[es] Install it",
      degit: "[es] Just this skill",
      clone: "[es] The whole registry",
    },
    copy: "[es] Copy",
    copied: "[es] Copied",

    formatNote:
      "[es] In Claude Code the two `/plugin` lines are all you need. Skills here " +
      "follow the open [Agent Skills](spec) format, so they also work in " +
      "ChatGPT, Codex, Gemini CLI, Copilot, Cursor and others — those take a " +
      "skill at a time, so use the download above.",
    pathsNote:
      "[es] Install paths differ across agent tools — `.claude/skills/`, " +
      "`.agents/skills/`, and others. Check your tool's docs for where it looks.",
    github: "[es] View on GitHub",
  },

  history: {
    heading: "[es] Version and history",

    when: (iso: string) => new Date(iso).toLocaleDateString(
      locale(), { month: "long", year: "numeric", timeZone: "UTC" }),
    version: "[es] Version",
    versionAside:
      "[es] — the author’s own number for it. Self-reported, and not checked " +
      "against anything.",
    firstSeen: "[es] Listed since",
    lastChanged: "[es] Last changed",
    commits: "[es] Times changed",
    commitsAside:
      "[es] — a count, not a measure. It says nothing about whether the skill is " +
      "well maintained: one change may mean finished.",
    note:
      "[es] Dates come from this repository’s own history, for this path. A skill " +
      "moved between namespaces starts again here, so an early date is " +
      "reliable and a recent one may just mean it was renamed.",
  },
};
