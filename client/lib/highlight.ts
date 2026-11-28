import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import kotlin from "highlight.js/lib/languages/kotlin";
import php from "highlight.js/lib/languages/php";
import plaintext from "highlight.js/lib/languages/plaintext";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";

/** Languages a question's code can be tagged with. Keep in step with server/enums/code_languages.py. */
export const CODE_LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "java", label: "Java" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "kotlin", label: "Kotlin" },
  { value: "php", label: "PHP" },
  { value: "sql", label: "SQL" },
  { value: "bash", label: "Bash" },
  { value: "json", label: "JSON" },
  { value: "xml", label: "HTML / XML" },
  { value: "plaintext", label: "Plain text" },
] as const;

const registry = { bash, c, cpp, csharp, go, java, javascript, json, kotlin, php, plaintext, python, rust, sql, typescript, xml };
for (const [name, definition] of Object.entries(registry)) hljs.registerLanguage(name, definition);

/** Highlighted HTML for `code`. highlight.js escapes the source, so the result is safe to inject. */
export function highlightCode(code: string, language?: string | null): string {
  const lang = language && hljs.getLanguage(language) ? language : "plaintext";
  return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
}
