const ABI_CONTRACT = {
  module: 'env',
  functions: {
    print_i32: {
      params: ['i32'],
      result: null,
      cName: 'js_print_i32',
    },
    abort: {
      params: ['i32'],
      result: null,
      cName: 'js_abort',
    },
  },
};

function resolveImportByCName(cName) {
  for (const [importName, desc] of Object.entries(ABI_CONTRACT.functions)) {
    if (desc.cName === cName) {
      return {
        module: ABI_CONTRACT.module,
        name: importName,
        params: desc.params,
        result: desc.result,
      };
    }
  }
  return null;
}

module.exports = {
  ABI_CONTRACT,
  resolveImportByCName,
};
