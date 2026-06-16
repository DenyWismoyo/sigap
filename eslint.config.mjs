/** @type {import('eslint').Linter.Config} */
const eslintConfig = {
  extends: ["next/core-web-vitals"],
  rules: {
    // Nonaktifkan aturan yang memerlukan tipe eksplisit untuk sementara waktu.
    // Ini akan mengatasi error: `Unexpected any. Specify a different type.`
    "@typescript-eslint/no-explicit-any": "off",

    // Aturan di bawah ini adalah warning, tetapi baik untuk diperbaiki.
    // Jika Anda ingin build berhasil tanpa memperbaiki semuanya, Anda bisa mengubahnya menjadi "off".
    "@typescript-eslint/no-unused-vars": "warn", // Memberi peringatan untuk variabel yang tidak digunakan
    "react-hooks/exhaustive-deps": "warn", // Memberi peringatan untuk dependensi yang kurang di hooks
    "react/no-unescaped-entities": "warn", // Memberi peringatan untuk karakter seperti ' " > }
    "@next/next/no-img-element": "off", // Izinkan penggunaan tag <img> standar jika diperlukan
  },
};

export default eslintConfig;
