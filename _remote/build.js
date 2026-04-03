import * as esbuild from "esbuild";

async function build() {
  const serve = process.argv.includes("--serve");
  const options = {
    entryPoints: ["src/index.js"],
    outfile: "www/index.js",
    bundle: true,
    minify: true,
    sourcemap: true,
    target: ["chrome89", "firefox90", "safari15", "edge89"],
  };

  if (serve) {
    const ctx = await esbuild.context(options);

    await ctx.watch();
    await ctx.serve({
      servedir: "www",
      port: 8000,
    });

    console.log("Running at http://127.0.0.1:8000");
  } else {
    await esbuild.build(options);
  }
}

build();
