import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

type AttachmentCategory =
	| "external"
	| "media"
	| "bare-present"
	| "bare-missing"
	| "other";

type AttachmentFinding = {
	file: string;
	category: AttachmentCategory;
};

type EntryReport = {
	indexPath: string;
	attachments: AttachmentFinding[];
	orphanedFiles: string[];
};

const root = process.cwd();
const collections = ["src/content/aktualne", "src/content/press-releases"];
const trackedExtensions = new Set([
	".jpg",
	".jpeg",
	".png",
	".webp",
	".gif",
	".pdf",
	".docx",
	".mp4",
]);

const attachmentCounts: Record<AttachmentCategory, number> = {
	external: 0,
	media: 0,
	"bare-present": 0,
	"bare-missing": 0,
	other: 0,
};

const reports: EntryReport[] = [];
let entriesScanned = 0;

function toPosix(relativePath: string): string {
	return relativePath.split(path.sep).join("/");
}

function getFrontmatterAndBody(source: string): {
	frontmatter: string;
	body: string;
} {
	const normalized = source.replace(/\r\n/g, "\n");

	if (!normalized.startsWith("---\n")) {
		return { frontmatter: "", body: normalized };
	}

	const endMarker = "\n---\n";
	const endIndex = normalized.indexOf(endMarker, 4);

	if (endIndex === -1) {
		return { frontmatter: "", body: normalized };
	}

	return {
		frontmatter: normalized.slice(4, endIndex),
		body: normalized.slice(endIndex + endMarker.length),
	};
}

function unquote(value: string): string {
	const trimmed = value.trim();
	const quote = trimmed[0];

	if (
		(quote === '"' || quote === "'") &&
		trimmed.length >= 2 &&
		trimmed[trimmed.length - 1] === quote
	) {
		return trimmed.slice(1, -1).trim();
	}

	return trimmed;
}

function parseAttachmentFiles(frontmatter: string): string[] {
	const files: string[] = [];
	const lines = frontmatter.split("\n");
	let inAttachments = false;
	let attachmentsIndent = 0;

	for (const line of lines) {
		const trimmed = line.trim();

		if (!inAttachments) {
			const match = line.match(/^(\s*)attachments\s*:\s*(.*)$/);
			if (!match) {
				continue;
			}

			attachmentsIndent = match[1].length;
			const inlineValue = match[2].trim();

			for (const inlineFile of inlineValue.matchAll(/\bfile\s*:\s*([^,\]}]+)/g)) {
				files.push(unquote(inlineFile[1]));
			}

			if (inlineValue === "[]" || inlineValue !== "") {
				continue;
			}

			inAttachments = true;
			continue;
		}

		if (trimmed === "" || trimmed.startsWith("#")) {
			continue;
		}

		const indent = line.match(/^\s*/)?.[0].length ?? 0;
		if (indent <= attachmentsIndent && /^[A-Za-z0-9_-]+\s*:/.test(trimmed)) {
			inAttachments = false;
			continue;
		}

		const fileMatch = trimmed.match(/^(?:-\s*)?file\s*:\s*(.*)$/);
		if (fileMatch) {
			files.push(unquote(fileMatch[1]));
		}
	}

	return files;
}

function isBareRelativeFilename(file: string): boolean {
	return (
		file.length > 0 &&
		!file.startsWith("/") &&
		!file.includes("/") &&
		!file.includes("\\") &&
		!/^[A-Za-z][A-Za-z0-9+.-]*:/.test(file)
	);
}

function classifyAttachment(file: string, entryDir: string): AttachmentCategory {
	if (file.startsWith("http://") || file.startsWith("https://")) {
		return "external";
	}

	if (file.startsWith("/media/")) {
		return "media";
	}

	if (isBareRelativeFilename(file)) {
		return existsSync(path.join(entryDir, file)) ? "bare-present" : "bare-missing";
	}

	return "other";
}

function parseBodyImageTargets(body: string): Set<string> {
	const targets = new Set<string>();

	for (const match of body.matchAll(/!\[[^\]]*]\(([^)\s]+)(?:\s+["'][^)]*["'])?\)/g)) {
		targets.add(unquote(match[1].split("#")[0].split("?")[0]));
	}

	return targets;
}

function getEntryIndexPaths(collectionPath: string): string[] {
	const absoluteCollectionPath = path.join(root, collectionPath);

	if (!existsSync(absoluteCollectionPath)) {
		return [];
	}

	return readdirSync(absoluteCollectionPath)
		.sort((a, b) => a.localeCompare(b))
		.flatMap((entryName) => {
			const entryDir = path.join(absoluteCollectionPath, entryName);

			if (!statSync(entryDir).isDirectory()) {
				return [];
			}

			return ["index.md", "index.mdx"]
				.map((indexName) => path.join(entryDir, indexName))
				.filter((indexPath) => existsSync(indexPath));
		});
}

function isReferencedLocalFile(fileName: string, referencedFiles: Set<string>): boolean {
	if (referencedFiles.has(fileName)) {
		return true;
	}

	for (const reference of referencedFiles) {
		if (!isBareRelativeFilename(reference) && !reference.startsWith("/")) {
			continue;
		}

		if (path.basename(reference) === fileName && !reference.startsWith("/")) {
			return true;
		}
	}

	return false;
}

for (const collection of collections) {
	for (const indexPath of getEntryIndexPaths(collection)) {
		entriesScanned += 1;

		const entryDir = path.dirname(indexPath);
		const source = readFileSync(indexPath, "utf8");
		const { frontmatter, body } = getFrontmatterAndBody(source);
		const attachmentFiles = parseAttachmentFiles(frontmatter);
		const attachments = attachmentFiles.map((file) => {
			const category = classifyAttachment(file, entryDir);
			attachmentCounts[category] += 1;
			return { file, category };
		});

		const referencedFiles = new Set<string>(attachmentFiles);
		for (const imageTarget of parseBodyImageTargets(body)) {
			referencedFiles.add(imageTarget);
		}

		const orphanedFiles = readdirSync(entryDir)
			.sort((a, b) => a.localeCompare(b))
			.filter((fileName) => {
				const filePath = path.join(entryDir, fileName);
				const extension = path.extname(fileName).toLowerCase();

				return (
					fileName !== "index.md" &&
					fileName !== "index.mdx" &&
					statSync(filePath).isFile() &&
					trackedExtensions.has(extension) &&
					!isReferencedLocalFile(fileName, referencedFiles)
				);
			});

		const hasReportableAttachment = attachments.some(
			({ category }) =>
				category === "bare-present" ||
				category === "bare-missing" ||
				category === "other",
		);

		if (hasReportableAttachment || orphanedFiles.length > 0) {
			reports.push({ indexPath, attachments, orphanedFiles });
		}
	}
}

console.log("Attachment and local media audit");
console.log("");

for (const report of reports) {
	const relativeIndexPath = toPosix(path.relative(root, report.indexPath));
	console.log(relativeIndexPath);

	const reportableAttachments = report.attachments.filter(
		({ category }) =>
			category === "bare-present" ||
			category === "bare-missing" ||
			category === "other",
	);

	if (reportableAttachments.length > 0) {
		console.log("  attachments:");
		for (const category of ["bare-present", "bare-missing", "other"] as const) {
			const files = reportableAttachments.filter((item) => item.category === category);

			if (files.length === 0) {
				continue;
			}

			console.log(`    ${category}:`);
			for (const { file } of files) {
				console.log(`      - ${file}`);
			}
		}
	}

	if (report.orphanedFiles.length > 0) {
		console.log("  orphaned files:");
		for (const file of report.orphanedFiles) {
			console.log(`    - ${file}`);
		}
	}

	console.log("");
}

console.log("SUMMARY");
console.log(`  entries scanned: ${entriesScanned}`);
console.log(`  entries affected: ${reports.length}`);
console.log("  attachments:");
for (const category of [
	"external",
	"media",
	"bare-present",
	"bare-missing",
	"other",
] as const) {
	console.log(`    ${category}: ${attachmentCounts[category]}`);
}
console.log(
	`  orphaned files: ${reports.reduce((total, report) => total + report.orphanedFiles.length, 0)}`,
);
