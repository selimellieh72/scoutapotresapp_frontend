import type { Filters, Group, Post } from "../api/types"

const updatedAt = "2026-11-08T18:00:00.000Z"

export const demoGroups: Group[] = [
  {
    id: "d00000000000000000000001",
    name: "Groupe des Cèdres",
    description: "Une communauté scoute tournée vers la montagne, le service et les aventures en plein air.",
    logo: null,
    cover: null,
    updatedAt,
  },
  {
    id: "d00000000000000000000002",
    name: "Groupe Saint-Maron",
    description: "Des jeunes qui apprennent, construisent et grandissent ensemble au rythme des saisons.",
    logo: null,
    cover: null,
    updatedAt,
  },
  {
    id: "d00000000000000000000003",
    name: "Groupe Notre-Dame des Pins",
    description: "Un groupe familial où chaque activité devient une occasion de découvrir et de servir.",
    logo: null,
    cover: null,
    updatedAt,
  },
]

const identity = (group: Group) => ({ id: group.id, name: group.name, logo: group.logo })
const post = (
  id: string,
  group: Group,
  category: Post["category"],
  title: string,
  text: string,
  publishedAt: string,
): Post => ({
  id,
  group: identity(group),
  category,
  title,
  text,
  media: [],
  publishedAt,
  updatedAt: publishedAt,
})

const [cedres, saintMaron, pins] = demoGroups as [Group, Group, Group]

export const demoPosts: Post[] = [
  post("e00000000000000000000001", cedres, "article", "Sur les sentiers du Chouf", "Retour sur une marche pleine de découvertes, de rencontres et de petits défis relevés en équipe. Entre les cèdres et les vallées, chacun a trouvé sa place dans l’aventure.", "2026-11-08T15:30:00.000Z"),
  post("e00000000000000000000002", cedres, "atelier", "Construire une boussole simple", "Un atelier pratique pour comprendre le nord magnétique et fabriquer une petite boussole avec du matériel accessible.", "2026-11-07T13:00:00.000Z"),
  post("e00000000000000000000003", cedres, "installation", "Un coin veillée sous les étoiles", "Les pionniers ont imaginé puis monté un espace de veillée confortable, solide et discret au cœur du camp.", "2026-11-05T17:45:00.000Z"),
  post("e00000000000000000000004", cedres, "jeux", "Le défi des quatre directions", "Quatre équipes, quatre balises et une seule carte. Un jeu rapide qui mélange orientation, observation et coopération.", "2026-11-03T10:15:00.000Z"),
  post("e00000000000000000000005", saintMaron, "article", "Une journée au service du quartier", "Les unités se sont retrouvées pour nettoyer les sentiers, préparer des paniers et partager un moment avec les habitants.", "2026-11-08T09:20:00.000Z"),
  post("e00000000000000000000006", saintMaron, "atelier", "Nœuds utiles au camp", "Cabestan, tendeur et nœud de chaise : trois gestes essentiels répétés à travers de petits défis en binômes.", "2026-11-06T16:10:00.000Z"),
  post("e00000000000000000000007", saintMaron, "installation", "La table de patrouille", "Du croquis au montage final, la patrouille a construit une table stable en utilisant uniquement des perches et des cordes.", "2026-11-04T14:35:00.000Z"),
  post("e00000000000000000000008", saintMaron, "jeux", "Mission message secret", "Une course en relais ponctuée de codes, d’indices et de messages à transmettre sans se faire repérer.", "2026-11-02T11:40:00.000Z"),
  post("e00000000000000000000009", pins, "article", "Bienvenue aux nouvelles recrues", "Une première rencontre douce et joyeuse pour découvrir les unités, les responsables et les habitudes du groupe.", "2026-11-07T18:25:00.000Z"),
  post("e0000000000000000000000a", pins, "atelier", "Petits pains au feu de bois", "Préparer la pâte, gérer les braises et partager le résultat : un atelier gourmand qui demande patience et entraide.", "2026-11-05T12:05:00.000Z"),
  post("e0000000000000000000000b", pins, "installation", "Une entrée de camp accueillante", "Fanions, portique et panneau en bois donnent désormais une vraie identité à l’entrée du camp.", "2026-11-01T15:50:00.000Z"),
  post("e0000000000000000000000c", pins, "jeux", "Le grand relais des couleurs", "Un jeu dynamique pour les plus jeunes où rapidité, mémoire et esprit d’équipe comptent autant que la victoire.", "2026-10-30T09:30:00.000Z"),
]

export const isDemoGroup = (id?: string) => demoGroups.some(group => group.id === id)
export const findDemoGroup = (id?: string) => demoGroups.find(group => group.id === id)
export const findDemoPost = (id?: string) => demoPosts.find(item => item.id === id)

export function filterDemoGroups(filters: Filters = {}) {
  const query = filters.q?.trim().toLocaleLowerCase()
  if (!query) return demoGroups
  return demoGroups.filter(group => `${group.name} ${group.description}`.toLocaleLowerCase().includes(query))
}

export function filterDemoPosts(filters: Filters = {}, groupId?: string) {
  const query = filters.q?.trim().toLocaleLowerCase()
  return demoPosts.filter(item => {
    if (groupId && item.group.id !== groupId) return false
    if (filters.category && item.category !== filters.category) return false
    if (filters.contentType && filters.contentType !== "text") return false
    if (query && !`${item.title} ${item.text} ${item.group.name}`.toLocaleLowerCase().includes(query)) return false
    return true
  })
}
