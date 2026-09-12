/* Shim so the three copied-in files stay byte-identical to their source.
   view.mjs in the anatomy-proc workspace imports "./fitrig/index.mjs", where
   `fitrig` is a symlink to this folder's parent. A symlink does not survive a
   static deploy, so the same path is a real file here that just re-exports the
   rig. Re-copying muscles.mjs / body.mjs / view.mjs over this folder is a
   drop-in: nothing in them needs editing. */
export * from "../../index.mjs";
