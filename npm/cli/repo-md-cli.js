#!/usr/bin/env node
import { program as g } from "commander";
import n, { rmSync as c, mkdirSync as u, cpSync as h } from "fs";
import s from "path";
import { execSync as l } from "child_process";
import { createInterface as y } from "readline";
const w = "https://github.com/repo-md/starter-template";
async function v(a, m) {
  const e = s.resolve(process.cwd(), a);
  if (n.existsSync(e)) {
    const o = y({
      input: process.stdin,
      output: process.stdout
    }), p = await new Promise((i) => {
      o.question(`Directory ${a} already exists. Do you want to overwrite it? (y/N): `, i);
    });
    if (o.close(), p.toLowerCase() !== "y") {
      console.log("Aborting.");
      return;
    }
    c(e, { recursive: !0, force: !0 });
  }
  u(e, { recursive: !0 });
  let r = m.template || w;
  !r.startsWith("http://") && !r.startsWith("https://") && (r = `https://github.com/repo-md/${r}-template`), console.log(`Creating new RepoMD project in ${e}...`), console.log(`Using template: ${r}`);
  const t = s.join(e, ".temp-template");
  u(t, { recursive: !0 });
  try {
    console.log("Downloading template..."), l(`git clone ${r} ${t}`, { stdio: "inherit" });
    const o = s.join(t, ".git");
    n.existsSync(o) && c(o, { recursive: !0, force: !0 }), console.log("Copying template files...");
    const p = n.readdirSync(t);
    for (const i of p) {
      const d = s.join(t, i), f = s.join(e, i);
      i !== ".git" && i !== ".temp-template" && h(d, f, { recursive: !0 });
    }
    console.log("Initializing git repository..."), l("git init", { cwd: e, stdio: "inherit" }), l("git add .", { cwd: e, stdio: "inherit" }), l('git commit -m "repo.md initial commit"', { cwd: e, stdio: "inherit" }), c(t, { recursive: !0, force: !0 }), console.log(`
Project created successfully! 🎉`), console.log(`
Next steps:`), console.log(`  cd ${a}`), console.log("  npm install"), console.log("  npm run dev");
  } catch (o) {
    console.error("Error creating project:", o), n.existsSync(t) && c(t, { recursive: !0, force: !0 });
  }
}
const D = [
  "basic",
  "react",
  "vue",
  "next",
  "next-portfolio"
];
async function $(a, m) {
  if (!m.template) {
    console.error("Error: Template (-t, --template) is required."), console.log(`
Available templates:`), D.forEach((o) => console.log(`  - ${o}`)), console.log(`
Visit repo.md/templates for a complete list of templates.`);
    return;
  }
  const e = s.resolve(process.cwd(), a);
  if (n.existsSync(e)) {
    const o = y({
      input: process.stdin,
      output: process.stdout
    }), p = await new Promise((i) => {
      o.question(`Directory ${a} already exists. Do you want to overwrite it? (y/N): `, i);
    });
    if (o.close(), p.toLowerCase() !== "y") {
      console.log("Aborting.");
      return;
    }
    c(e, { recursive: !0, force: !0 });
  }
  u(e, { recursive: !0 });
  let r = m.template;
  !r.startsWith("http://") && !r.startsWith("https://") && (r = `https://github.com/repo-md/app-template-${r}`), console.log(`Creating new app in ${e}...`), console.log(`Using template: ${r}`);
  const t = s.join(e, ".temp-template");
  u(t, { recursive: !0 });
  try {
    console.log("Downloading template..."), l(`git clone ${r} ${t}`, { stdio: "inherit" });
    const o = s.join(t, ".git");
    n.existsSync(o) && c(o, { recursive: !0, force: !0 }), console.log("Copying template files...");
    const p = n.readdirSync(t);
    for (const i of p) {
      const d = s.join(t, i), f = s.join(e, i);
      i !== ".git" && i !== ".temp-template" && h(d, f, { recursive: !0 });
    }
    console.log("Initializing git repository..."), l("git init", { cwd: e, stdio: "inherit" }), l("git add .", { cwd: e, stdio: "inherit" }), l('git commit -m "repo.md app initial commit"', { cwd: e, stdio: "inherit" }), c(t, { recursive: !0, force: !0 }), console.log(`
App created successfully! 🎉`), console.log(`
Next steps:`), console.log(`  cd ${a}`), console.log("  npm install"), console.log("  npm run dev");
  } catch (o) {
    console.error("Error creating app:", o), n.existsSync(t) && c(t, { recursive: !0, force: !0 });
  }
}
g.name("repomd").description("RepoMD CLI for creating and managing content repositories").version("0.0.1");
g.command("create").description("Create a new Repo.md project (content folder)").argument("<directory>", "Directory to create the project in").option("--template <template>", "Template to use (name or GitHub URL)").action(v);
g.command("create-app").description("Create a new app (website) to publish your content into").argument("<directory>", "Directory to create the app in").requiredOption("-t, --template <template>", "Template to use (name or GitHub URL)").action($);
g.parse();
