import { describe, expect, it } from "vitest"
import { categories } from "../src/api/types"
import {
  demoGroups,
  demoPosts,
  filterDemoGroups,
  filterDemoPosts,
} from "../src/demo/content"

describe("demo content", () => {
  it("provides every category for every demo group", () => {
    expect(demoGroups).toHaveLength(3)
    expect(demoPosts).toHaveLength(12)

    for (const group of demoGroups) {
      const groupPosts = filterDemoPosts({}, group.id)
      expect(new Set(groupPosts.map(post => post.category))).toEqual(new Set(categories))
    }
  })

  it("supports category and text search filters", () => {
    expect(filterDemoPosts({ category: "atelier" })).toHaveLength(3)
    expect(filterDemoPosts({ q: "boussole" }).map(post => post.title)).toEqual(["Construire une boussole simple"])
    expect(filterDemoGroups({ q: "cèdres" }).map(group => group.name)).toEqual(["Groupe des Cèdres"])
  })
})
