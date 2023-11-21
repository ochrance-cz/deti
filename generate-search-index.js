const fs = require("fs");
const slug = require("slug");
const yaml = require("js-yaml");
const MarkdownIt = require("markdown-it");
const md = new MarkdownIt();

const dirs = fs
  .readdirSync("content/", { withFileTypes: true })
  .filter((dir) => dir.isDirectory())
  .map((dir) => dir.name)
  .reduce((acc, dir) => {
    acc.push(dir);

    acc.push(
      ...fs
        .readdirSync("content/" + dir, { withFileTypes: true })
        .filter((subdir) => subdir.isDirectory())
        .map((subdir) => dir + "/" + subdir.name),
    );

    return acc;
  }, []);

console.log("Creating search index from " + dirs.length + " dirs.\n");

const index = dirs.reduce((arr, dir) => {
  const files = fs
    .readdirSync("content/" + dir)
    .filter((f) => f.match(/\.(md|markdown)$/))
    .map((f) => {
      const file = dir + "/" + f;
      const content = fs.readFileSync("content/" + file, "utf8");
      const [x, fm, body] = content.split("---\n");
      const params = yaml.load(fm);
      const name = params.title;
      const url = "/" + dir + "/" + (params.slug ? params.slug + "/" : "");

      const text = file.match("index")
        ? extractDataFromIndex(body, params)
        : extractDataFromPage(body, params);
      return { url, name, text };
    });
  return [...arr, ...files];
}, []);

fs.writeFileSync("./static/search.index.json", JSON.stringify(index) + "\n");

function extractDataFromIndex(body, params) {
  const tips = params.tips || [];

  return [
    cleanup(body),
    cleanup(tips.map((t) => t.label + " — " + t.description).join(" | ")),
  ].join(" | ");
}

function extractDataFromPage(body, params) {
  const fixes = params.fixes || [];

  return [
    cleanup(params.edited),
    cleanup(fixes.map((f) => f.description).join(" | ")),
  ].join(" | ");
}

function cleanup(markdown) {
  return markdown ? md.render(markdown).replace(/<\/?[^>]+(>|$)/g, "") : "";
}
