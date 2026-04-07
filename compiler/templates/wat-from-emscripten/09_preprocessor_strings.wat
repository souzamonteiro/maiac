(module

  (type (func
  ))
  (type (func
    (result i32)
  ))
  (type (func
    (param i32)
  ))
  (type (func
    (param i32 i32)
    (result i32)
  ))

  (import "wasi_snapshot_preview1" "args_sizes_get"
    (func (type 3)))
  (import "wasi_snapshot_preview1" "args_get"
    (func (type 3)))
  (import "env" "__main_argc_argv"
    (func (type 3)))
  (import "wasi_snapshot_preview1" "proc_exit"
    (func (type 2)))

  (table 2 2 funcref)

  (memory 257 257)

  (global (mut i32) (i32.const 65536))
  (global (mut i32) (i32.const 0))
  (global (mut i32) (i32.const 0))

  (export "memory" (memory 0))
  (export "_start" (func 5))
  (export "__indirect_function_table" (table 0))
  (export "emscripten_stack_init" (func 11))
  (export "emscripten_stack_get_free" (func 12))
  (export "emscripten_stack_get_base" (func 13))
  (export "emscripten_stack_get_end" (func 14))
  (export "stackSave" (func 15))
  (export "stackRestore" (func 16))
  (export "emscripten_stack_get_current" (func 17))

  (elem (i32.const 1) func 4)

  (func (type 0)
    call 11
  )
  (func (type 0)
    block
    i32.const 1
    i32.eqz
    br_if 0
    call 4
    end
    call 6
    call 9
    unreachable
  )
  (func (type 1) (result i32)
    (local i32 i32 i32 i32)
    global.get 0
    i32.const 16
    i32.sub
    local.tee 0
    global.set 0
    block
    block
    local.get 0
    local.tee 1
    i32.const 12
    i32.add
    local.get 1
    i32.const 8
    i32.add
    call 0
    br_if 0
    block
    block
    local.get 1
    i32.load offset=12 align=4
    local.tee 2
    br_if 0
    i32.const 0
    local.set 2
    i32.const 0
    local.set 0
    br 1
    end
    local.get 0
    local.get 2
    i32.const 2
    i32.shl
    local.tee 2
    i32.const 19
    i32.add
    i32.const -16
    i32.and
    i32.sub
    local.tee 0
    local.tee 3
    global.set 0
    local.get 3
    local.get 1
    i32.load offset=8 align=4
    i32.const 15
    i32.add
    i32.const -16
    i32.and
    i32.sub
    local.tee 3
    global.set 0
    local.get 0
    local.get 2
    i32.add
    i32.const 0
    i32.store offset=0 align=4
    local.get 0
    local.get 3
    call 1
    br_if 2
    local.get 1
    i32.load offset=12 align=4
    local.set 2
    end
    local.get 2
    local.get 0
    call 2
    local.set 0
    local.get 1
    i32.const 16
    i32.add
    global.set 0
    local.get 0
    return
    end
    i32.const 71
    call 3
    unreachable
    end
    i32.const 71
    call 3
    unreachable
  )
  (func (type 0)
  )
  (func (type 0)
    (local i32)
    i32.const 0
    local.set 0
    block
    i32.const 0
    i32.const 0
    i32.le_u
    br_if 0
    loop
    local.get 0
    i32.const -4
    i32.add
    local.tee 0
    i32.load offset=0 align=4
    call_indirect (type 0)
    local.get 0
    i32.const 0
    i32.gt_u
    br_if 0
    end
    end
    call 7
  )
  (func (type 2) (param i32)
    call 7
    call 8
    call 7
    local.get 0
    call 10
    unreachable
  )
  (func (type 2) (param i32)
    local.get 0
    call 3
    unreachable
  )
  (func (type 0)
    i32.const 65536
    global.set 2
    i32.const 0
    i32.const 15
    i32.add
    i32.const -16
    i32.and
    global.set 1
  )
  (func (type 1) (result i32)
    global.get 0
    global.get 1
    i32.sub
  )
  (func (type 1) (result i32)
    global.get 2
  )
  (func (type 1) (result i32)
    global.get 1
  )
  (func (type 1) (result i32)
    global.get 0
  )
  (func (type 2) (param i32)
    local.get 0
    global.set 0
  )
  (func (type 1) (result i32)
    global.get 0
  )
)
