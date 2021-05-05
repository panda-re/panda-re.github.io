URLS=[
"pandare/index.html",
"pandare/plog_reader.html",
"pandare/utils.html",
"pandare/arch.html",
"pandare/panda.html",
"pandare/taint/index.html",
"pandare/taint/TaintQuery.html",
"pandare/qcows.html",
"pandare/panda_expect.html",
"pandare/extras/index.html",
"pandare/extras/fileHook.html",
"pandare/extras/modeFilter.html",
"pandare/extras/ioctlFaker.html",
"pandare/extras/procWriteCapture.html",
"pandare/extras/fileFaker.html"
];
INDEX=[
{
"ref":"pandare",
"url":0,
"doc":" pandare (also called PyPANDA) is a Python 3 module built for interacting with the PANDA project. The module enables driving an execution of a virtual machine while also introspecting on its execution using PANDA's callback and plugin systems. Most of the commonly used APIs are in  pandare.panda . Example plugins are available in the [examples directory](https: github.com/panda-re/panda/tree/master/panda/python/examples).  PyPANDA PyPANDA is a python interface to PANDA. With PyPANDA, you can quickly develop plugins to analyze behavior of a running system, record a system and analyze replays, or do nearly anything you can do using PANDA's C/C APIs.  Installation Follow PANDA's build instructions. The  panda docker container includes the  pandare package. If you setup panda with the  install_ubuntu.sh script, it will install PyPANDA for you. Otherwise, when your install instructions tell you to run  build.sh be sure to include the   python flag.  Example program This program counts the number of basic blocks executed while running  uname -a inside a 32-bit guest.   from pandare import Panda panda = Panda(generic='i386')  Create an instance of panda  Counter of the number of basic blocks blocks = 0  Register a callback to run before_block_exec and increment blocks @panda.cb_before_block_exec def before_block_execute(cpustate, transblock): global blocks blocks += 1  This 'blocking' function is queued to run in a seperate thread from the main CPU loop  which allows for it to wait for the guest to complete commands @panda.queue_blocking def run_cmd():  First revert to the qcow's root snapshot (synchronously) panda.revert_sync(\"root\")  Then type a command via the serial port and print its results print(panda.run_serial_cmd(\"uname -a\"  When the command finishes, terminate the panda.run() call panda.end_analysis()  Start the guest panda.run() print(\"Finished. Saw a total of {} basic blocks during execution\".format(blocks    Usage  Create an instance of Panda The  Panda class takes many arguments, but the only crucial argument is a specificed qcow image. If you wish to get started quickly you may use the  pandare.qcows.Qcows module to automatically download a pre-configured virtual machine for you to use. For example:  panda = Panda(generic='i386')  Register a callback   @panda.cb_before_block_exec def my_before_block_fn(cpustate, translation_block): pc = panda.current_pc(cpustate) print(\"About to run the block at 0x{:x}\".format(pc   The panda object creates decorators named  cb_[CALLBACK_NAME] for each PANDA callback. The decorated functions must take the same number of arguments, and return the same type as expected by the original C callback, see [Callback List](https: github.com/panda-re/panda/tree/master/panda/docs/manual.md appendix-a-callback-list) for more information. The decorated functions are called at the appropriate times, similarly to how a PANDA plugin written in C behaves.  Enable and disable callbacks Python callbacks can be enabled and disabled using their names. By default, a callback is named after the function that is decorated. For example, the callback describe in   @panda.cb_before_block_exec def my_before_block_fn(cpustate, translation_block):  .   is named  my_before_block_fn and can be disabled with  panda.disable_callback('my_before_block_fn') and later enabled with  panda.enable_callback('my_before_block_fn') . Callbacks can be given custom names and disabled at initialization by passing arguments to their decorators:   @panda.cb_before_block_exec(name='my_callback', enabled=False) def my_before_block_fn(cpustate, translation_block):  . panda.enable_callback('my_callback')   If a callback is decorated with a  procname argument, it will only be enabled when that process is running. To permanently disable such a callback, you can use  panda.disable_callback('name', forever=True) . Note that if you wish to define a function multiple times (e.g., inside a loop), you'll need to give it multiple names or it will be overwritten.   for x in range(10): @panda.cb_before_block_exec(name=f\"bbe_{x}\") def bbe_loop(cpu, tb): print(f\"Before block exec function  {x}\")    Replaying Recordings   panda = Panda( .)  Register functions to run on callbacks here panda.run_replay(\"/file/path/here\")  Runs the replay    Load and unload a C plugin A C plugin can be loaded from pypanda easily:  panda.load_plugin(\"stringsearch\") C plugins can be passed named arguments using a dictionary:  panda.load_plugin(\"stringsearch\", {\"name\": \"jpeg\"}) Or unnamed arguments using a list:  panda.load_plugin(\"my_plugin\", [\"arg1\", \"arg2\"])  Asynchronous Activity When a callback is executing, the guest is suspended until the callback finishes. However, we often want to interact with guests during our analyses. In these situations, we run code asynchronously to send data into and wait for results from the guest. PyPANDA is designed to easily support such analyses with the  @panda.queue_blocking decorator. Consider if you with to run the commands  uname -a , then  whoami in a guest. If your guest exposes a console over a serial port (as all the 'generic' qcows we use do), you could run these commands by simply typing them and waiting for a response. But if you were to do this in a callback, the guest would have no chance to respond to your commands and you'd end up in a deadlock where your callback code never terminates until the guest executes your command, and the guest will never execute commands until your callback terminates. Instead, you can queue up blocking functions to run asynchronously as follows:   panda =  . @panda.queue_blocking def first_cmd(): print(panda.run_serial_cmd(\"uname -a\" @panda.queue_blocking def second_cmd(): print(panda.run_serial_cmd(\"whoami\" panda.end_analysis() panda.run()   Note that the  panda.queue_blocking decorator both marks a function as being a blocking function (which allows it to use functions such as  panda.run_serial_cmd ) and queues it up to run after the call to  panda.run()  Recordings See [take_recording.py](https: github.com/panda-re/panda/tree/master/panda/python/examples/take_recording.py) A replay can be taken with the function  panda.record_cmd('cmd_to_run', recording_name='replay_name') which will revert the guest to a  root snapshot, type a command, begin a recording, press enter, wait for the command to finish, and then end the replay. Once a replay is created on disk, it can be analyzed by using  panda.run_replay('replay_name') . Alternatively, you can begin/end the recording through the monitor with  panda.run_monitor_cmd('begin_record myname') and  panda.run_monitor_cmd('end_record') and drive the guest using  panda.run_serial_cmd in the middle.  Typical Use Patterns  Live system Example: [asid.py](https: github.com/panda-re/panda/tree/master/panda/python/examples/asid.py). 1. Initialize a panda object based off a generic machine or a qcow you have. 2. Register functions to run at various PANDA callbacks. 3. Register and queue up a blocking function to revert the guest to a snapshot, run commands with  panda.run_serial_cmd() , and stop the execution with  panda.end_analysis() 5. Start the execution with  panda.run()  Record/Replay Example: [tests/record_then_replay.py](https: github.com/panda-re/panda/tree/master/panda/python/tests/record_then_replay.py). 1. Initialize a panda object based off a generic machine or a qcow you have. 2. Register and queue up a blocking function to drive guest execution while recording or with  panda.record_cmd then call  panda.end_analysis() 3. Register functions to run at various PANDA callbacks. 5. Analyze the replay with  panda.run_replay(filename)  Additional Information  Here be dragons  You can't have multiple instances of panda running at the same time. Once you've created a panda object for a given architecture, you can never create another. Hoewver, you can modify the machine after it's created to run a new analysis as long as you don't change the machine type.  PyPANDA is slower than traditional PANDA. Well-engineered plugins typically have a runtime overhead of ~10% compared to regular PANDA plugins (for up to 10M instructions). To improve performance try disabling callbacks when possible and only enabling them when they are needed.  Extending PyPANDA PyPANDA currently supports interactions (e.g., ppp callbacks) with many PANDA plugins such as  taint2 and  osi . If you wish to extend PyPANDA to support an new plugin, its header file must be cleaned up such that it can be parsed by CFFI. See [create_panda_datatypes.py](https: github.com/panda-re/panda/tree/master/panda/python/utils/create_panda_datatypes.py) and the magic  BEGIN_PYPANDA_NEEDS_THIS strings it searches for.  Learn more The [PyPANDA paper](https: moyix.net/~moyix/papers/pypanda.pdf) was published at the NDSS Binary Analysis Research Workshop in 2021 and includes details on the project's design goals as well as an evaluation of it's usability and performance."
},
{
"ref":"pandare.plog_reader",
"url":1,
"doc":"Module for reading and writing PANDAlog (plog) files from Python."
},
{
"ref":"pandare.plog_reader.PLogReader",
"url":1,
"doc":"A class for reading PANDAlog (plog) files. Run directly with  python -m pandare.plog_reader [input.plog] to translate input.plog file to json. Or the class can be imported and used in a Python script, where it can be iterated over to get [google.protobuf.message.Message](https: googleapis.dev/python/protobuf/latest/google/protobuf/message.html google.protobuf.message.Message) objects. with PLogReader('input.plog') as plr: for msg in plr: if msg.HasField(\"SomeField\"): print(msg.SomeField) if msg.HasField(\"OtherField\"): print(msg.otherField)"
},
{
"ref":"pandare.utils",
"url":2,
"doc":"Misc helper functions"
},
{
"ref":"pandare.utils.progress",
"url":2,
"doc":"Print a message with a green \"[PYPANDA]\" prefix",
"func":1
},
{
"ref":"pandare.utils.warn",
"url":2,
"doc":"Print a message with a red \"[PYPANDA]\" prefix",
"func":1
},
{
"ref":"pandare.utils.make_iso",
"url":2,
"doc":"Generate an iso from a directory",
"func":1
},
{
"ref":"pandare.utils.telescope",
"url":2,
"doc":"Given a value, check if it's a pointer by seeing if we can map it to physical memory. If so, recursively print where it points to until 1) It points to a string (then print the string) 2) It's code (then disassembly the insn) 3) It's an invalid pointer 4) It's the 5th time we've done this, break TODO Should use memory protections to determine string/code/data",
"func":1
},
{
"ref":"pandare.utils.blocking",
"url":2,
"doc":"Decorator to ensure a function isn't run in the main thread",
"func":1
},
{
"ref":"pandare.utils.GArrayIterator",
"url":2,
"doc":"Iterator which will run a function on each iteration incrementing the second argument. Useful for GArrays with an accessor function that takes arguments of the GArray and list index. e.g., osi's get_one_module."
},
{
"ref":"pandare.utils.plugin_list",
"url":2,
"doc":"Wrapper class around list of active C plugins"
},
{
"ref":"pandare.arch",
"url":3,
"doc":"This module contains architecture-specific code. When the  pandare.panda class is initialized it will automatically initialize a PandaArch class for the specified architecture in the variable  panda.arch ."
},
{
"ref":"pandare.arch.PandaArch",
"url":3,
"doc":"Base class for architecture-specific implementations for PANDA-supported architectures Initialize a PANDA-supported architecture and hold a handle on the PANDA object"
},
{
"ref":"pandare.arch.PandaArch.get_reg",
"url":3,
"doc":"Return value in a  reg which is either a register name or index (e.g., \"R0\" or 0)",
"func":1
},
{
"ref":"pandare.arch.PandaArch.set_reg",
"url":3,
"doc":"Set register  reg to a value where  reg is either a register name or index (e.g., \"R0\" or 0)",
"func":1
},
{
"ref":"pandare.arch.PandaArch.get_pc",
"url":3,
"doc":"Returns the current program counter. Must be overloaded if self.reg_pc is None",
"func":1
},
{
"ref":"pandare.arch.PandaArch.set_arg",
"url":3,
"doc":"Set arg [idx] to [val] for given calling convention. Note for syscalls we define arg[0] as syscall number and then 1-index the actual args",
"func":1
},
{
"ref":"pandare.arch.PandaArch.get_arg",
"url":3,
"doc":"Return arg [idx] for given calling convention. This only works right as the guest is calling or has called a function before register values are clobbered. Note for syscalls we define arg[0] as syscall number and then 1-index the actual args",
"func":1
},
{
"ref":"pandare.arch.PandaArch.set_retval",
"url":3,
"doc":"Set return val to [val] for given calling convention. This only works right after a function call has returned, otherwise the register will contain a different value.",
"func":1
},
{
"ref":"pandare.arch.PandaArch.get_retval",
"url":3,
"doc":"Set return val to [val] for given calling convention. This only works right after a function call has returned, otherwise the register will contain a different value.",
"func":1
},
{
"ref":"pandare.arch.PandaArch.set_pc",
"url":3,
"doc":"Set the program counter. Must be overloaded if self.reg_pc is None",
"func":1
},
{
"ref":"pandare.arch.PandaArch.dump_regs",
"url":3,
"doc":"Print (telescoping) each register and its values",
"func":1
},
{
"ref":"pandare.arch.PandaArch.dump_stack",
"url":3,
"doc":"Print (telescoping) most recent  words words on the stack (from stack pointer to stack pointer +  words word_size)",
"func":1
},
{
"ref":"pandare.arch.PandaArch.dump_state",
"url":3,
"doc":"Print registers and stack",
"func":1
},
{
"ref":"pandare.arch.PandaArch.get_args",
"url":3,
"doc":"",
"func":1
},
{
"ref":"pandare.arch.PandaArch.registers",
"url":3,
"doc":"Mapping of register names to indices into the appropriate CPUState array"
},
{
"ref":"pandare.arch.ArmArch",
"url":3,
"doc":"Register names and accessors for ARM Initialize a PANDA-supported architecture and hold a handle on the PANDA object"
},
{
"ref":"pandare.arch.ArmArch.get_return_value",
"url":3,
"doc":"returns register value used to return results",
"func":1
},
{
"ref":"pandare.arch.ArmArch.get_return_address",
"url":3,
"doc":"looks up where ret will go",
"func":1
},
{
"ref":"pandare.arch.ArmArch.registers",
"url":3,
"doc":"Mapping of register names to indices into the appropriate CPUState array"
},
{
"ref":"pandare.arch.ArmArch.get_reg",
"url":3,
"doc":"Return value in a  reg which is either a register name or index (e.g., \"R0\" or 0)",
"func":1
},
{
"ref":"pandare.arch.ArmArch.set_reg",
"url":3,
"doc":"Set register  reg to a value where  reg is either a register name or index (e.g., \"R0\" or 0)",
"func":1
},
{
"ref":"pandare.arch.ArmArch.get_pc",
"url":3,
"doc":"Returns the current program counter. Must be overloaded if self.reg_pc is None",
"func":1
},
{
"ref":"pandare.arch.ArmArch.set_arg",
"url":3,
"doc":"Set arg [idx] to [val] for given calling convention. Note for syscalls we define arg[0] as syscall number and then 1-index the actual args",
"func":1
},
{
"ref":"pandare.arch.ArmArch.get_arg",
"url":3,
"doc":"Return arg [idx] for given calling convention. This only works right as the guest is calling or has called a function before register values are clobbered. Note for syscalls we define arg[0] as syscall number and then 1-index the actual args",
"func":1
},
{
"ref":"pandare.arch.ArmArch.set_retval",
"url":3,
"doc":"Set return val to [val] for given calling convention. This only works right after a function call has returned, otherwise the register will contain a different value.",
"func":1
},
{
"ref":"pandare.arch.ArmArch.get_retval",
"url":3,
"doc":"Set return val to [val] for given calling convention. This only works right after a function call has returned, otherwise the register will contain a different value.",
"func":1
},
{
"ref":"pandare.arch.ArmArch.set_pc",
"url":3,
"doc":"Set the program counter. Must be overloaded if self.reg_pc is None",
"func":1
},
{
"ref":"pandare.arch.ArmArch.dump_regs",
"url":3,
"doc":"Print (telescoping) each register and its values",
"func":1
},
{
"ref":"pandare.arch.ArmArch.dump_stack",
"url":3,
"doc":"Print (telescoping) most recent  words words on the stack (from stack pointer to stack pointer +  words word_size)",
"func":1
},
{
"ref":"pandare.arch.ArmArch.dump_state",
"url":3,
"doc":"Print registers and stack",
"func":1
},
{
"ref":"pandare.arch.Aarch64Arch",
"url":3,
"doc":"Register names and accessors for ARM64 (Aarch64) Initialize a PANDA-supported architecture and hold a handle on the PANDA object"
},
{
"ref":"pandare.arch.Aarch64Arch.get_pc",
"url":3,
"doc":"Overloaded function to get aarch64 program counter. Note the PC is not stored in a general purpose reg",
"func":1
},
{
"ref":"pandare.arch.Aarch64Arch.set_pc",
"url":3,
"doc":"Overloaded function set AArch64 program counter",
"func":1
},
{
"ref":"pandare.arch.Aarch64Arch.get_return_value",
"url":3,
"doc":"returns register value used to return results",
"func":1
},
{
"ref":"pandare.arch.Aarch64Arch.get_return_address",
"url":3,
"doc":"looks up where ret will go",
"func":1
},
{
"ref":"pandare.arch.Aarch64Arch.registers",
"url":3,
"doc":"Mapping of register names to indices into the appropriate CPUState array"
},
{
"ref":"pandare.arch.Aarch64Arch.get_reg",
"url":3,
"doc":"Return value in a  reg which is either a register name or index (e.g., \"R0\" or 0)",
"func":1
},
{
"ref":"pandare.arch.Aarch64Arch.set_reg",
"url":3,
"doc":"Set register  reg to a value where  reg is either a register name or index (e.g., \"R0\" or 0)",
"func":1
},
{
"ref":"pandare.arch.Aarch64Arch.set_arg",
"url":3,
"doc":"Set arg [idx] to [val] for given calling convention. Note for syscalls we define arg[0] as syscall number and then 1-index the actual args",
"func":1
},
{
"ref":"pandare.arch.Aarch64Arch.get_arg",
"url":3,
"doc":"Return arg [idx] for given calling convention. This only works right as the guest is calling or has called a function before register values are clobbered. Note for syscalls we define arg[0] as syscall number and then 1-index the actual args",
"func":1
},
{
"ref":"pandare.arch.Aarch64Arch.set_retval",
"url":3,
"doc":"Set return val to [val] for given calling convention. This only works right after a function call has returned, otherwise the register will contain a different value.",
"func":1
},
{
"ref":"pandare.arch.Aarch64Arch.get_retval",
"url":3,
"doc":"Set return val to [val] for given calling convention. This only works right after a function call has returned, otherwise the register will contain a different value.",
"func":1
},
{
"ref":"pandare.arch.Aarch64Arch.dump_regs",
"url":3,
"doc":"Print (telescoping) each register and its values",
"func":1
},
{
"ref":"pandare.arch.Aarch64Arch.dump_stack",
"url":3,
"doc":"Print (telescoping) most recent  words words on the stack (from stack pointer to stack pointer +  words word_size)",
"func":1
},
{
"ref":"pandare.arch.Aarch64Arch.dump_state",
"url":3,
"doc":"Print registers and stack",
"func":1
},
{
"ref":"pandare.arch.MipsArch",
"url":3,
"doc":"Register names and accessors for MIPS Initialize a PANDA-supported architecture and hold a handle on the PANDA object"
},
{
"ref":"pandare.arch.MipsArch.get_pc",
"url":3,
"doc":"Overloaded function to return the MIPS current program counter",
"func":1
},
{
"ref":"pandare.arch.MipsArch.set_pc",
"url":3,
"doc":"Overloaded function set the MIPS program counter",
"func":1
},
{
"ref":"pandare.arch.MipsArch.get_return_value",
"url":3,
"doc":"returns register value used to return results",
"func":1
},
{
"ref":"pandare.arch.MipsArch.get_call_return",
"url":3,
"doc":"looks up where ret will go",
"func":1
},
{
"ref":"pandare.arch.MipsArch.get_reg",
"url":3,
"doc":"Return value in a  reg which is either a register name or index (e.g., \"R0\" or 0)",
"func":1
},
{
"ref":"pandare.arch.MipsArch.set_reg",
"url":3,
"doc":"Set register  reg to a value where  reg is either a register name or index (e.g., \"R0\" or 0)",
"func":1
},
{
"ref":"pandare.arch.MipsArch.set_arg",
"url":3,
"doc":"Set arg [idx] to [val] for given calling convention. Note for syscalls we define arg[0] as syscall number and then 1-index the actual args",
"func":1
},
{
"ref":"pandare.arch.MipsArch.get_arg",
"url":3,
"doc":"Return arg [idx] for given calling convention. This only works right as the guest is calling or has called a function before register values are clobbered. Note for syscalls we define arg[0] as syscall number and then 1-index the actual args",
"func":1
},
{
"ref":"pandare.arch.MipsArch.set_retval",
"url":3,
"doc":"Set return val to [val] for given calling convention. This only works right after a function call has returned, otherwise the register will contain a different value.",
"func":1
},
{
"ref":"pandare.arch.MipsArch.get_retval",
"url":3,
"doc":"Set return val to [val] for given calling convention. This only works right after a function call has returned, otherwise the register will contain a different value.",
"func":1
},
{
"ref":"pandare.arch.MipsArch.dump_regs",
"url":3,
"doc":"Print (telescoping) each register and its values",
"func":1
},
{
"ref":"pandare.arch.MipsArch.dump_stack",
"url":3,
"doc":"Print (telescoping) most recent  words words on the stack (from stack pointer to stack pointer +  words word_size)",
"func":1
},
{
"ref":"pandare.arch.MipsArch.dump_state",
"url":3,
"doc":"Print registers and stack",
"func":1
},
{
"ref":"pandare.arch.MipsArch.registers",
"url":3,
"doc":"Mapping of register names to indices into the appropriate CPUState array"
},
{
"ref":"pandare.arch.X86Arch",
"url":3,
"doc":"Register names and accessors for x86 Initialize a PANDA-supported architecture and hold a handle on the PANDA object"
},
{
"ref":"pandare.arch.X86Arch.get_pc",
"url":3,
"doc":"Overloaded function to return the x86 current program counter",
"func":1
},
{
"ref":"pandare.arch.X86Arch.set_pc",
"url":3,
"doc":"Overloaded function to set the x86 program counter",
"func":1
},
{
"ref":"pandare.arch.X86Arch.get_return_value",
"url":3,
"doc":"returns register value used to return results",
"func":1
},
{
"ref":"pandare.arch.X86Arch.get_return_address",
"url":3,
"doc":"looks up where ret will go",
"func":1
},
{
"ref":"pandare.arch.X86Arch.get_reg",
"url":3,
"doc":"Return value in a  reg which is either a register name or index (e.g., \"R0\" or 0)",
"func":1
},
{
"ref":"pandare.arch.X86Arch.set_reg",
"url":3,
"doc":"Set register  reg to a value where  reg is either a register name or index (e.g., \"R0\" or 0)",
"func":1
},
{
"ref":"pandare.arch.X86Arch.set_arg",
"url":3,
"doc":"Set arg [idx] to [val] for given calling convention. Note for syscalls we define arg[0] as syscall number and then 1-index the actual args",
"func":1
},
{
"ref":"pandare.arch.X86Arch.get_arg",
"url":3,
"doc":"Return arg [idx] for given calling convention. This only works right as the guest is calling or has called a function before register values are clobbered. Note for syscalls we define arg[0] as syscall number and then 1-index the actual args",
"func":1
},
{
"ref":"pandare.arch.X86Arch.set_retval",
"url":3,
"doc":"Set return val to [val] for given calling convention. This only works right after a function call has returned, otherwise the register will contain a different value.",
"func":1
},
{
"ref":"pandare.arch.X86Arch.get_retval",
"url":3,
"doc":"Set return val to [val] for given calling convention. This only works right after a function call has returned, otherwise the register will contain a different value.",
"func":1
},
{
"ref":"pandare.arch.X86Arch.dump_regs",
"url":3,
"doc":"Print (telescoping) each register and its values",
"func":1
},
{
"ref":"pandare.arch.X86Arch.dump_stack",
"url":3,
"doc":"Print (telescoping) most recent  words words on the stack (from stack pointer to stack pointer +  words word_size)",
"func":1
},
{
"ref":"pandare.arch.X86Arch.dump_state",
"url":3,
"doc":"Print registers and stack",
"func":1
},
{
"ref":"pandare.arch.X86Arch.registers",
"url":3,
"doc":"Mapping of register names to indices into the appropriate CPUState array"
},
{
"ref":"pandare.arch.X86_64Arch",
"url":3,
"doc":"Register names and accessors for x86_64 Initialize a PANDA-supported architecture and hold a handle on the PANDA object"
},
{
"ref":"pandare.arch.X86_64Arch.get_pc",
"url":3,
"doc":"Overloaded function to return the x86_64 current program counter",
"func":1
},
{
"ref":"pandare.arch.X86_64Arch.set_pc",
"url":3,
"doc":"Overloaded function to set the x86_64 program counter",
"func":1
},
{
"ref":"pandare.arch.X86_64Arch.get_return_value",
"url":3,
"doc":"returns register value used to return results",
"func":1
},
{
"ref":"pandare.arch.X86_64Arch.get_return_address",
"url":3,
"doc":"looks up where ret will go",
"func":1
},
{
"ref":"pandare.arch.X86_64Arch.get_reg",
"url":3,
"doc":"Return value in a  reg which is either a register name or index (e.g., \"R0\" or 0)",
"func":1
},
{
"ref":"pandare.arch.X86_64Arch.set_reg",
"url":3,
"doc":"Set register  reg to a value where  reg is either a register name or index (e.g., \"R0\" or 0)",
"func":1
},
{
"ref":"pandare.arch.X86_64Arch.set_arg",
"url":3,
"doc":"Set arg [idx] to [val] for given calling convention. Note for syscalls we define arg[0] as syscall number and then 1-index the actual args",
"func":1
},
{
"ref":"pandare.arch.X86_64Arch.get_arg",
"url":3,
"doc":"Return arg [idx] for given calling convention. This only works right as the guest is calling or has called a function before register values are clobbered. Note for syscalls we define arg[0] as syscall number and then 1-index the actual args",
"func":1
},
{
"ref":"pandare.arch.X86_64Arch.set_retval",
"url":3,
"doc":"Set return val to [val] for given calling convention. This only works right after a function call has returned, otherwise the register will contain a different value.",
"func":1
},
{
"ref":"pandare.arch.X86_64Arch.get_retval",
"url":3,
"doc":"Set return val to [val] for given calling convention. This only works right after a function call has returned, otherwise the register will contain a different value.",
"func":1
},
{
"ref":"pandare.arch.X86_64Arch.dump_regs",
"url":3,
"doc":"Print (telescoping) each register and its values",
"func":1
},
{
"ref":"pandare.arch.X86_64Arch.dump_stack",
"url":3,
"doc":"Print (telescoping) most recent  words words on the stack (from stack pointer to stack pointer +  words word_size)",
"func":1
},
{
"ref":"pandare.arch.X86_64Arch.dump_state",
"url":3,
"doc":"Print registers and stack",
"func":1
},
{
"ref":"pandare.arch.X86_64Arch.registers",
"url":3,
"doc":"Mapping of register names to indices into the appropriate CPUState array"
},
{
"ref":"pandare.panda",
"url":4,
"doc":"This module simply contains the Panda class"
},
{
"ref":"pandare.panda.Panda",
"url":4,
"doc":"This is the object used to interact with PANDA. Initializing it creates a virtual machine to interact with. Construct a new  Panda object. Note that multiple Panda objects cannot coexist in the same Python instance. Args: arch: architecture string (e.g. \"i386\", \"x86_64\", \"arm\", \"mips\", \"mipsel\") generic: specify a generic qcow to use from  pandare.qcows.SUPPORTED_IMAGES and set all subsequent arguments. Will automatically download qcow if necessary. mem: size of memory for machine (e.g. \"128M\", \"1G\") expect_prompt: Regular expression describing the prompt exposed by the guest on a serial console. Used so we know when a running command has finished with its output. os_version: analagous to PANDA's -os argument (e.g, linux-32-debian:3.2.0-4-686-pae\") os: type of OS (e.g. \"linux\") qcow: path to a qcow file to load raw_monitor: When set, don't specify a -monitor. arg Allows for use of -nographic in args with ctrl-A+C for interactive qemu prompt. Experts only! extra_args: extra arguments to pass to PANDA as either a string or an array. (e.g. \"-nographic\" or [\"-nographic\", \"-net\", \"none\"]) Returns: Panda: the created panda object"
},
{
"ref":"pandare.panda.Panda.queue_main_loop_wait_fn",
"url":4,
"doc":"Queue a function to run at the next main loop fn is a function we want to run, args are arguments to apss to it",
"func":1
},
{
"ref":"pandare.panda.Panda.exit_cpu_loop",
"url":4,
"doc":"Stop cpu execution at nearest juncture.",
"func":1
},
{
"ref":"pandare.panda.Panda.revert_async",
"url":4,
"doc":"Request a snapshot revert, eventually. This is fairly dangerous because you don't know when it finishes. You should be using revert_sync from a blocking function instead",
"func":1
},
{
"ref":"pandare.panda.Panda.reset",
"url":4,
"doc":"In the next main loop, reset to boot",
"func":1
},
{
"ref":"pandare.panda.Panda.cont",
"url":4,
"doc":"Continue execution (run after vm_stop)",
"func":1
},
{
"ref":"pandare.panda.Panda.vm_stop",
"url":4,
"doc":"Stop execution, default code means RUN_STATE_PAUSED",
"func":1
},
{
"ref":"pandare.panda.Panda.snap",
"url":4,
"doc":"Create snapshot with specified name Args: snapshot_name (str): name of the snapshot Returns: None",
"func":1
},
{
"ref":"pandare.panda.Panda.delvm",
"url":4,
"doc":"Delete snapshot with specified name Args: snapshot_name (str): name of the snapshot Returns: None",
"func":1
},
{
"ref":"pandare.panda.Panda.enable_tb_chaining",
"url":4,
"doc":"This function enables translation block chaining in QEMU",
"func":1
},
{
"ref":"pandare.panda.Panda.disable_tb_chaining",
"url":4,
"doc":"This function disables translation block chaining in QEMU",
"func":1
},
{
"ref":"pandare.panda.Panda.run",
"url":4,
"doc":"This function starts our running PANDA instance from Python. At termination this function returns and the script continues to run after it. This function starts execution of the guest. It blocks until guest finishes. It also initializes panda object, clears main_loop_wait fns, and sets up internal callbacks. Args: None Returns: None: When emulation has finished due to guest termination, replay conclusion or a call to  Panda.end_analysis ",
"func":1
},
{
"ref":"pandare.panda.Panda.end_analysis",
"url":4,
"doc":"Stop running machine. Call from any thread to unload all plugins and stop all queued functions. If called from async thread or a callback, it will also unblock panda.run() Note here we use the async class's internal thread to process these without needing to wait for tasks in the main async thread",
"func":1
},
{
"ref":"pandare.panda.Panda.record",
"url":4,
"doc":"Begins active recording with name provided. Args: recording_name (string): name of recording to save. snapshot_name (string, optional): Before recording starts restore to this snapshot name. Defaults to None. Raises: Exception: raises exception if there was an error starting recording.",
"func":1
},
{
"ref":"pandare.panda.Panda.end_record",
"url":4,
"doc":"Stop active recording. Raises: Exception: raises exception if there was an error stopping recording.",
"func":1
},
{
"ref":"pandare.panda.Panda.recording_exists",
"url":4,
"doc":"Checks if a recording file exists on disk. Args: name (str): name of the recording to check for (e.g.,  foo which uses  foo-rr-snp and  foo-rr-nondet.log ) Returns: boolean: true if file exists, false otherwise",
"func":1
},
{
"ref":"pandare.panda.Panda.run_replay",
"url":4,
"doc":"Load a replay and run it. Starts PANDA execution and returns after end of VM execution. Args: replaypfx (str): Replay name/path (e.g., \"foo\" or \"./dir/foo\") Returns: None",
"func":1
},
{
"ref":"pandare.panda.Panda.end_replay",
"url":4,
"doc":"Terminates a currently running replay Returns: None Raises: Exception: raises exception if no replay is active or termination failed.",
"func":1
},
{
"ref":"pandare.panda.Panda.require",
"url":4,
"doc":"Load a C plugin with no arguments. Deprecated. Use load_plugin",
"func":1
},
{
"ref":"pandare.panda.Panda.load_plugin",
"url":4,
"doc":"Load a C plugin, optionally with arguments Args: name (str): Name of plugin args (dict): Arguments matching key to value. e.g. {\"key\": \"value\"} sets option  key to  value . Returns: None.",
"func":1
},
{
"ref":"pandare.panda.Panda.unload_plugin",
"url":4,
"doc":"Unload plugin with given name. Args: name (str): Name of plug Returns: None",
"func":1
},
{
"ref":"pandare.panda.Panda.unload_plugins",
"url":4,
"doc":"Disable all python plugins and request to unload all c plugins at the next main_loop_wait. XXX: If called during shutdown/exit, c plugins won't be unloaded because the next main_loop_wait will never happen. Instead, call panda.panda_finish directly (which is done at the end of panda.run( ",
"func":1
},
{
"ref":"pandare.panda.Panda.memsavep",
"url":4,
"doc":"Calls QEMU memsavep on your specified python file.",
"func":1
},
{
"ref":"pandare.panda.Panda.physical_memory_read",
"url":4,
"doc":"Read guest physical memory. In the specified format. Note that the  ptrlist format returns a list of integers, each of the specified architecture's pointer size. Args: addr (int): Address length (int): length of array you would like returned fmt (str): format for returned array. Options: 'bytearray', 'int', 'str', 'ptrlist' Returns: Union[bytearray, int, str, list[int : memory data Raises: ValueError if memory access fails or fmt is unsupported",
"func":1
},
{
"ref":"pandare.panda.Panda.virtual_memory_read",
"url":4,
"doc":"Read guest virtual memory. Args: cpu (CPUState): CPUState structure addr (int): Address length (int): length of data you would like returned fmt: format for returned array. See  physical_memory_read . Returns: Union[bytearray, int, str, list[int : memory data Raises: ValueError if memory access fails or fmt is unsupported",
"func":1
},
{
"ref":"pandare.panda.Panda.physical_memory_write",
"url":4,
"doc":"Write guest physical memory. Args: addr (int): Address buf (bytestring): byte string to write into memory Returns: bool: error",
"func":1
},
{
"ref":"pandare.panda.Panda.virtual_memory_write",
"url":4,
"doc":"Write guest virtual memory. Args: cpu (CPUState): CPUState structure address (int): Address buf (bytestr): byte string to write into memory Returns: bool: error",
"func":1
},
{
"ref":"pandare.panda.Panda.callstack_callers",
"url":4,
"doc":"Helper function for callstack_instr plugin Handle conversion and return get_callers from callstack_instr.",
"func":1
},
{
"ref":"pandare.panda.Panda.queue_async",
"url":4,
"doc":"Explicitly queue work in the asynchronous work queue. Args: f: A python function with no arguments to be called at a later time. The function should be decorated with  @pandare.blocking . You generally want to use  panda.queue_blocking over this function. Returns: None",
"func":1
},
{
"ref":"pandare.panda.Panda.map_memory",
"url":4,
"doc":"Make a new memory region. Args: name (str): This is an internal reference name for this region. Must be unique. size (int): number of bytes the region should be. address (int): start address of region Returns: None",
"func":1
},
{
"ref":"pandare.panda.Panda.read_str",
"url":4,
"doc":"Helper to read a null-terminated string from guest memory given a pointer and CPU state May return an exception if the call to panda.virtual_memory_read fails (e.g., if you pass a pointer to an unmapped page) Args: cpu (CPUState): CPUState structure ptr (int): Pointer to start of string max_length (int): Optional length to stop reading at Returns: string: Data read from memory",
"func":1
},
{
"ref":"pandare.panda.Panda.to_unsigned_guest",
"url":4,
"doc":"Convert a singed python int to an unsigned int32/unsigned int64 depending on guest bit-size Args: x (int): Python integer Returns: int: Python integer representing x as an unsigned value in the guest's pointer-size.",
"func":1
},
{
"ref":"pandare.panda.Panda.from_unsigned_guest",
"url":4,
"doc":"Convert an unsigned int32/unsigned int64 from the guest (depending on guest bit-size) to a (signed) python int Args: x (int): Python integer representing an unsigned value in the guest's pointer-size Returns: int: Python integer representing x as a signed value",
"func":1
},
{
"ref":"pandare.panda.Panda.queue_blocking",
"url":4,
"doc":"Decorator to mark a function as  blocking , and (by default) queue it to run asynchronously. This should be used to mark functions that will drive guest execution. Functions will be run in the order they are defined. For more precise control, use  panda.queue_async .   @panda.queue_blocking def do_something(): panda.revert_sync('root') print(panda.run_serial_cmd('whoami' panda.end_analysis()   is equivalent to   @blocking def run_whoami(): panda.revert_sync('root') print(panda.run_serial_cmd('whoami' panda.end_analysis() panda.queue_async(run_whoami)   Args: func (function): Function to queue queue (bool): Should function automatically be queued Returns: None",
"func":1
},
{
"ref":"pandare.panda.Panda.set_pandalog",
"url":4,
"doc":"Enable recording to a pandalog (plog) named  name Args: name (str): filename to output data to Returns: None",
"func":1
},
{
"ref":"pandare.panda.Panda.enable_memcb",
"url":4,
"doc":"Enable memory callbacks. Must be called for memory callbacks to work. pypanda enables this automatically with some callbacks.",
"func":1
},
{
"ref":"pandare.panda.Panda.disable_memcb",
"url":4,
"doc":"Disable memory callbacks. Must be enabled for memory callbacks to work. pypanda enables this automatically with some callbacks.",
"func":1
},
{
"ref":"pandare.panda.Panda.virt_to_phys",
"url":4,
"doc":"Convert virtual address to physical address. Args: cpu (CPUState): CPUState struct addr (int): virtual address to convert Return: int: physical address",
"func":1
},
{
"ref":"pandare.panda.Panda.enable_plugin",
"url":4,
"doc":"Enable plugin. Args: handle (int): pointer to handle returned by plugin Return: None",
"func":1
},
{
"ref":"pandare.panda.Panda.disable_plugin",
"url":4,
"doc":"Disable plugin. Args: handle (int): pointer to handle returned by plugin Return: None",
"func":1
},
{
"ref":"pandare.panda.Panda.enable_llvm",
"url":4,
"doc":"Enables the use of the LLVM JIT in replacement of the TCG (QEMU intermediate language and compiler) backend.",
"func":1
},
{
"ref":"pandare.panda.Panda.disable_llvm",
"url":4,
"doc":"Disables the use of the LLVM JIT in replacement of the TCG (QEMU intermediate language and compiler) backend.",
"func":1
},
{
"ref":"pandare.panda.Panda.enable_llvm_helpers",
"url":4,
"doc":"Enables the use of Helpers for the LLVM JIT in replacement of the TCG (QEMU intermediate language and compiler) backend.",
"func":1
},
{
"ref":"pandare.panda.Panda.disable_llvm_helpers",
"url":4,
"doc":"Disables the use of Helpers for the LLVM JIT in replacement of the TCG (QEMU intermediate language and compiler) backend.",
"func":1
},
{
"ref":"pandare.panda.Panda.flush_tb",
"url":4,
"doc":"This function requests that the translation block cache be flushed as soon as possible. If running with translation block chaining turned off (e.g. when in LLVM mode or replay mode), this will happen when the current translation block is done executing. Flushing the translation block cache is additionally necessary if the plugin makes changes to the way code is translated. For example, by using panda_enable_precise_pc.",
"func":1
},
{
"ref":"pandare.panda.Panda.enable_precise_pc",
"url":4,
"doc":"By default, QEMU does not update the program counter after every instruction. This function enables precise tracking of the program counter. After enabling precise PC tracking, the program counter will be available in env->panda_guest_pc and can be assumed to accurately reflect the guest state.",
"func":1
},
{
"ref":"pandare.panda.Panda.disable_precise_pc",
"url":4,
"doc":"By default, QEMU does not update the program counter after every instruction. This function disables precise tracking of the program counter.",
"func":1
},
{
"ref":"pandare.panda.Panda.in_kernel",
"url":4,
"doc":"Returns true if the processor is in the privilege level corresponding to kernel mode for any of the PANDA supported architectures. Legacy alias for in_kernel_mode().",
"func":1
},
{
"ref":"pandare.panda.Panda.in_kernel_mode",
"url":4,
"doc":"Check if the processor is running in priviliged mode. Args: cpu (CPUState): CPUState structure Returns: Bool: If the processor is in the privilege level corresponding to kernel mode for the given architecture",
"func":1
},
{
"ref":"pandare.panda.Panda.in_kernel_code_linux",
"url":4,
"doc":"Check if the processor is running in linux kernelspace. Args: cpu (CPUState): CPUState structure Returns: Bool: If the processor is running in Linux kernel space code.",
"func":1
},
{
"ref":"pandare.panda.Panda.g_malloc0",
"url":4,
"doc":"Helper function to call glib malloc Args: size (int): size to call with malloc Returns: buffer of the requested size from g_malloc",
"func":1
},
{
"ref":"pandare.panda.Panda.current_sp",
"url":4,
"doc":"Get current stack pointer Args: cpu (CPUState): CPUState structure Return: int: Value of stack pointer",
"func":1
},
{
"ref":"pandare.panda.Panda.current_pc",
"url":4,
"doc":"Get current program counter Args: cpu (CPUState): CPUState structure Return: integer value of current program counter  Deprecated Use panda.arch.get_pc(cpu) instead",
"func":1
},
{
"ref":"pandare.panda.Panda.current_asid",
"url":4,
"doc":"Get current Application Specific ID Args: cpu (CPUState): CPUState structure Returns: integer: value of current ASID",
"func":1
},
{
"ref":"pandare.panda.Panda.disas2",
"url":4,
"doc":"Call panda_disas to diasassemble an amount of code at a pointer. FIXME: seem to not match up to PANDA definition",
"func":1
},
{
"ref":"pandare.panda.Panda.cleanup",
"url":4,
"doc":"Unload all plugins and close pandalog. Returns: None",
"func":1
},
{
"ref":"pandare.panda.Panda.was_aborted",
"url":4,
"doc":"Returns true if panda was aborted.",
"func":1
},
{
"ref":"pandare.panda.Panda.get_cpu",
"url":4,
"doc":"This function returns first_cpu CPUState object from QEMU. XXX: You rarely want this Returns: CPUState: cpu",
"func":1
},
{
"ref":"pandare.panda.Panda.garray_len",
"url":4,
"doc":"Convenience function to get array length of glibc array. Args: g (garray): Pointer to a glibc array Returns: int: length of the array",
"func":1
},
{
"ref":"pandare.panda.Panda.panda_finish",
"url":4,
"doc":"Final stage call to underlying panda_finish with initialization.",
"func":1
},
{
"ref":"pandare.panda.Panda.rr_get_guest_instr_count",
"url":4,
"doc":"Returns record/replay guest instruction count. Returns: int: Current instruction count",
"func":1
},
{
"ref":"pandare.panda.Panda.drive_get",
"url":4,
"doc":"Gets DriveInfo struct from user specified information. Args: blocktype: BlockInterfaceType structure bus: integer bus unit: integer unit Returns: DriveInfo struct",
"func":1
},
{
"ref":"pandare.panda.Panda.sysbus_create_varargs",
"url":4,
"doc":"Returns DeviceState struct from user specified information Calls sysbus_create_varargs QEMU function. Args: name (str): addr (int): hwaddr Returns: DeviceState struct",
"func":1
},
{
"ref":"pandare.panda.Panda.cpu_class_by_name",
"url":4,
"doc":"Gets cpu class from name. Calls cpu_class_by_name QEMU function. Args: name: typename from python string cpu_model: string specified cpu model Returns: ObjectClass struct",
"func":1
},
{
"ref":"pandare.panda.Panda.object_class_by_name",
"url":4,
"doc":"Returns class as ObjectClass from name specified. Calls object_class_by_name QEMU function. Args name (str): string defined by user Returns: struct as specified by name",
"func":1
},
{
"ref":"pandare.panda.Panda.object_property_set_bool",
"url":4,
"doc":"Writes a bool value to a property. Calls object_property_set_bool QEMU function. Args value: the value to be written to the property name: the name of the property errp: returns an error if this function fails Returns: None",
"func":1
},
{
"ref":"pandare.panda.Panda.object_class_get_name",
"url":4,
"doc":"Gets String QOM typename from object class. Calls object_class_get_name QEMU function. Args objclass: class to obtain the QOM typename for. Returns: String QOM typename for klass.",
"func":1
},
{
"ref":"pandare.panda.Panda.object_new",
"url":4,
"doc":"Creates a new QEMU object from typename. This function will initialize a new object using heap allocated memory. The returned object has a reference count of 1, and will be freed when the last reference is dropped. Calls object_new QEMU function. Args: name (str): The name of the type of the object to instantiate. Returns: The newly allocated and instantiated object.",
"func":1
},
{
"ref":"pandare.panda.Panda.object_property_get_bool",
"url":4,
"doc":"Pull boolean from object. Calls object_property_get_bool QEMU function. Args: obj: the object name: the name of the property Returns: the value of the property, converted to a boolean, or NULL if an error occurs (including when the property value is not a bool).",
"func":1
},
{
"ref":"pandare.panda.Panda.object_property_set_int",
"url":4,
"doc":"Set integer in QEMU object. Writes an integer value to a property. Calls object_property_set_int QEMU function. Args: value: the value to be written to the property name: the name of the property Returns: None",
"func":1
},
{
"ref":"pandare.panda.Panda.object_property_get_int",
"url":4,
"doc":"Gets integer in QEMU object. Reads an integer value from this property. Calls object_property_get_int QEMU function. Paramaters: obj: the object name: the name of the property Returns: the value of the property, converted to an integer, or negative if an error occurs (including when the property value is not an integer).",
"func":1
},
{
"ref":"pandare.panda.Panda.object_property_set_link",
"url":4,
"doc":"Writes an object's canonical path to a property. Calls object_property_set_link QEMU function. Args: value: the value to be written to the property name: the name of the property errp: returns an error if this function fails Returns: None",
"func":1
},
{
"ref":"pandare.panda.Panda.object_property_get_link",
"url":4,
"doc":"Reads an object's canonical path to a property. Calls object_property_get_link QEMU function. Args: obj: the object name: the name of the property errp: returns an error if this function fails Returns: the value of the property, resolved from a path to an Object, or NULL if an error occurs (including when the property value is not a string or not a valid object path).",
"func":1
},
{
"ref":"pandare.panda.Panda.object_property_find",
"url":4,
"doc":"Look up a property for an object and return its  ObjectProperty if found. Calls object_property_find QEMU function. Args: obj: the object name: the name of the property errp: returns an error if this function fails Returns: struct ObjectProperty pointer",
"func":1
},
{
"ref":"pandare.panda.Panda.memory_region_allocate_system_memory",
"url":4,
"doc":"Allocates Memory region by user specificiation. Calls memory_region_allocation_system_memory QEMU function. Args: mr: MemoryRegion struct obj: Object struct name (str): Region name ram_size (int): RAM size Returns: None",
"func":1
},
{
"ref":"pandare.panda.Panda.memory_region_add_subregion",
"url":4,
"doc":"Calls memory_region_add_subregion from QEMU. memory_region_add_subregion: Add a subregion to a container. Adds a subregion at @offset. The subregion may not overlap with other subregions (except for those explicitly marked as overlapping). A region may only be added once as a subregion (unless removed with memory_region_del_subregion( ; use memory_region_init_alias() if you want a region to be a subregion in multiple locations. Args: mr: the region to contain the new subregion; must be a container initialized with memory_region_init(). offset: the offset relative to @mr where @subregion is added. subregion: the subregion to be added. Returns: None",
"func":1
},
{
"ref":"pandare.panda.Panda.memory_region_init_ram_from_file",
"url":4,
"doc":"Calls memory_region_init_ram_from_file from QEMU. memory_region_init_ram_from_file: Initialize RAM memory region with a mmap-ed backend. Args: mr: the  MemoryRegion to be initialized. owner: the object that tracks the region's reference count name: the name of the region. size: size of the region. share: %true if memory must be mmaped with the MAP_SHARED flag path: the path in which to allocate the RAM. errp: pointer to Error , to store an error if it happens. Returns: None",
"func":1
},
{
"ref":"pandare.panda.Panda.create_internal_gic",
"url":4,
"doc":"",
"func":1
},
{
"ref":"pandare.panda.Panda.create_one_flash",
"url":4,
"doc":"",
"func":1
},
{
"ref":"pandare.panda.Panda.create_external_gic",
"url":4,
"doc":"",
"func":1
},
{
"ref":"pandare.panda.Panda.create_virtio_devices",
"url":4,
"doc":"",
"func":1
},
{
"ref":"pandare.panda.Panda.arm_load_kernel",
"url":4,
"doc":"",
"func":1
},
{
"ref":"pandare.panda.Panda.error_report",
"url":4,
"doc":"",
"func":1
},
{
"ref":"pandare.panda.Panda.get_system_memory",
"url":4,
"doc":"",
"func":1
},
{
"ref":"pandare.panda.Panda.lookup_gic",
"url":4,
"doc":"",
"func":1
},
{
"ref":"pandare.panda.Panda.set_os_name",
"url":4,
"doc":"Set OS target. Equivalent to \"-os\" flag on the command line. Matches the form of: \"windows[-_]32[-_]xpsp[23]\", \"windows[-_]32[-_]7\", \"windows[-_]32[-_]2000\", \"linux[-_]32[-_].+\", \"linux[-_]64[-_].+\", Args: os_name (str): Name that matches the format for the os flag. Returns: None",
"func":1
},
{
"ref":"pandare.panda.Panda.get_mappings",
"url":4,
"doc":"Get all active memory mappings in the system. Requires: OSI Args: cpu: CPUState struct Returns: pandare.utils.GArrayIterator: iterator of OsiModule structures",
"func":1
},
{
"ref":"pandare.panda.Panda.get_processes",
"url":4,
"doc":"Get all running processes in the system. Includes kernel modules on Linux. Requires: OSI Args: cpu: CPUState struct Returns: pandare.utils.GArrayIterator: iterator of OsiProc structures",
"func":1
},
{
"ref":"pandare.panda.Panda.get_processes_dict",
"url":4,
"doc":"Get all running processes for the system at this moment in time as a dictionary. The dictionary maps proceses by their PID. Each mapping returns a dictionary containing the process name, its pid, and its parent pid (ppid). Requires: OSI Args: cpu: CPUState struct Returns: Dict: processes as described above",
"func":1
},
{
"ref":"pandare.panda.Panda.get_process_name",
"url":4,
"doc":"Get the name of the current process. May return None if OSI cannot identify the current process",
"func":1
},
{
"ref":"pandare.panda.Panda.pyperiph_read_cb",
"url":4,
"doc":"",
"func":1
},
{
"ref":"pandare.panda.Panda.pyperiph_write_cb",
"url":4,
"doc":"",
"func":1
},
{
"ref":"pandare.panda.Panda.register_pyperipheral",
"url":4,
"doc":"Registers a python peripheral, and the necessary attributes to the panda-object, if not present yet.",
"func":1
},
{
"ref":"pandare.panda.Panda.unregister_pyperipheral",
"url":4,
"doc":"deregisters a python peripheral. The pyperiph parameter can be either an object, or an address Returns true if the pyperipheral was successfully removed, else false.",
"func":1
},
{
"ref":"pandare.panda.Panda.taint_enable",
"url":4,
"doc":"Inform python that taint is enabled.",
"func":1
},
{
"ref":"pandare.panda.Panda.taint_label_reg",
"url":4,
"doc":"",
"func":1
},
{
"ref":"pandare.panda.Panda.taint_label_ram",
"url":4,
"doc":"",
"func":1
},
{
"ref":"pandare.panda.Panda.taint_check_reg",
"url":4,
"doc":"",
"func":1
},
{
"ref":"pandare.panda.Panda.taint_check_ram",
"url":4,
"doc":"",
"func":1
},
{
"ref":"pandare.panda.Panda.taint_get_reg",
"url":4,
"doc":"Returns array of results, one for each byte in this register None if no taint. QueryResult struct otherwise",
"func":1
},
{
"ref":"pandare.panda.Panda.taint_get_ram",
"url":4,
"doc":"",
"func":1
},
{
"ref":"pandare.panda.Panda.taint_check_laddr",
"url":4,
"doc":"",
"func":1
},
{
"ref":"pandare.panda.Panda.taint_get_laddr",
"url":4,
"doc":"",
"func":1
},
{
"ref":"pandare.panda.Panda.taint_sym_enable",
"url":4,
"doc":"Inform python that taint is enabled.",
"func":1
},
{
"ref":"pandare.panda.Panda.taint_sym_label_ram",
"url":4,
"doc":"",
"func":1
},
{
"ref":"pandare.panda.Panda.taint_sym_label_reg",
"url":4,
"doc":"",
"func":1
},
{
"ref":"pandare.panda.Panda.make_panda_file_handler",
"url":4,
"doc":"Constructs a file and file handler that volatility can't ignore to back by PANDA physical memory",
"func":1
},
{
"ref":"pandare.panda.Panda.get_volatility_symbols",
"url":4,
"doc":"",
"func":1
},
{
"ref":"pandare.panda.Panda.run_volatility",
"url":4,
"doc":"",
"func":1
},
{
"ref":"pandare.panda.Panda.stop_run",
"url":4,
"doc":"From a blocking thread, request vl.c loop to break. Returns control flow in main thread. In other words, once this is called, panda.run() will finish and your main thread will continue. If you also want to unload plugins, use end_analysis instead XXX: This doesn't work in replay mode",
"func":1
},
{
"ref":"pandare.panda.Panda.run_serial_cmd",
"url":4,
"doc":"Run a command inside the guest through a terminal exposed over a serial port. Can only be used if your guest is configured in this way Guest output will be analyzed until we see the expect_prompt regex printed (i.e., the PS1 prompt) Args: cmd: command to run. timeout: maximum time to wait for the command to finish no_timeout: if set, don't ever timeout Returns: String: all the output (stdout + stderr) printed after typing your command and pressing enter until the next prompt was printed.",
"func":1
},
{
"ref":"pandare.panda.Panda.run_serial_cmd_async",
"url":4,
"doc":"Type a command and press enter in the guest. Return immediately. No results available Only use this if you know what you're doing!",
"func":1
},
{
"ref":"pandare.panda.Panda.type_serial_cmd",
"url":4,
"doc":"",
"func":1
},
{
"ref":"pandare.panda.Panda.finish_serial_cmd",
"url":4,
"doc":"",
"func":1
},
{
"ref":"pandare.panda.Panda.run_monitor_cmd",
"url":4,
"doc":"",
"func":1
},
{
"ref":"pandare.panda.Panda.revert_sync",
"url":4,
"doc":"Args: snapshot_name: name of snapshot in the current qcow to load Returns: String: error message. Empty on success.",
"func":1
},
{
"ref":"pandare.panda.Panda.delvm_sync",
"url":4,
"doc":"",
"func":1
},
{
"ref":"pandare.panda.Panda.copy_to_guest",
"url":4,
"doc":"Copy a directory from the host into the guest by 1) Creating an .iso image of the directory on the host 2) Run a bash command to mount it at the exact same path + .ro and then copy the files to the provided path 3) If the directory contains setup.sh, run it Args: copy_directory: Local directory to copy into guest iso_name: Name of iso file that will be generated. Defaults to [copy_directory].iso absolute_paths: is copy_directory an absolute or relative path seutp_script: name of a script which, if present inside copy_directory, will be automatically run after the copy timeout: maximum time each copy command will be allowed to run for, will use the  run_serial_cmd default value unless another is provided Returns: None",
"func":1
},
{
"ref":"pandare.panda.Panda.record_cmd",
"url":4,
"doc":"Take a recording as follows: 0) Revert to the specified snapshot name if one is set. By default 'root'. Set to  None if you have already set up the guest and are ready to record with no revert 1) Create an ISO of files that need to be copied into the guest if copy_directory is specified. Copy them in 2) Run the setup_command in the guest, if provided 3) Type the command you wish to record but do not press enter to begin execution. This avoids the recording capturing the command being typed 4) Begin the recording (name controlled by recording_name) 5) Press enter in the guest to begin the command. Wait until it finishes. 6) End the recording",
"func":1
},
{
"ref":"pandare.panda.Panda.interact",
"url":4,
"doc":"Expose console interactively until user types pandaquit Must be run in blocking thread. TODO: This should probably repace self.serial_console with something that directly renders output to the user. Then we don't have to handle buffering and other problems. But we will need to re-enable the serial_console interface after this returns",
"func":1
},
{
"ref":"pandare.panda.Panda.do_panda_finish",
"url":4,
"doc":"Call panda_finish. Note this isn't really blocking - the guest should have exited by now, but queue this after (blocking) shutdown commands in our internal async queue so it must also be labeled as blocking.",
"func":1
},
{
"ref":"pandare.panda.Panda.register_cb_decorators",
"url":4,
"doc":"Setup callbacks and generate self.cb_XYZ functions for cb decorators XXX Don't add any other methods with names starting with 'cb_' Callbacks can be called as @panda.cb_XYZ in which case they'll take default arguments and be named the same as the decorated function Or they can be called as @panda.cb_XYZ(name='A', procname='B', enabled=True). Defaults: name is function name, procname=None, enabled=True unless procname set",
"func":1
},
{
"ref":"pandare.panda.Panda.register_callback",
"url":4,
"doc":"",
"func":1
},
{
"ref":"pandare.panda.Panda.is_callback_enabled",
"url":4,
"doc":"",
"func":1
},
{
"ref":"pandare.panda.Panda.enable_internal_callbacks",
"url":4,
"doc":"Enable all our internal callbacks that start with __ such as __main_loop_wait and __asid_changed. Important in case user has done a panda.end_analysis() and then (re)called run",
"func":1
},
{
"ref":"pandare.panda.Panda.enable_all_callbacks",
"url":4,
"doc":"Enable all python callbacks that have been disabled",
"func":1
},
{
"ref":"pandare.panda.Panda.enable_callback",
"url":4,
"doc":"Enable a panda plugin using its handle and cb.number as a unique ID",
"func":1
},
{
"ref":"pandare.panda.Panda.disable_callback",
"url":4,
"doc":"Disable a panda plugin using its handle and cb.number as a unique ID If forever is specified, we'll never reenable the call- useful when you want to really turn off something with a procname filter.",
"func":1
},
{
"ref":"pandare.panda.Panda.delete_callback",
"url":4,
"doc":"Completely delete a registered panda callback by name",
"func":1
},
{
"ref":"pandare.panda.Panda.delete_callbacks",
"url":4,
"doc":"",
"func":1
},
{
"ref":"pandare.panda.Panda.ppp",
"url":4,
"doc":"Decorator for plugin-to-plugin interface. Note this isn't in decorators.py becuase it uses the panda object. Example usage to register my_run with syscalls2 as a 'on_sys_open_return' @ppp(\"syscalls2\", \"on_sys_open_return\") def my_fun(cpu, pc, filename, flags, mode):  .",
"func":1
},
{
"ref":"pandare.panda.Panda.disable_ppp",
"url":4,
"doc":"Disable a ppp-style callback by name. Unlike regular panda callbacks which can be enabled/disabled/deleted, PPP callbacks are only enabled/deleted (which we call disabled) Example usage to register my_run with syscalls2 as a 'on_sys_open_return' and then disable:   @ppp(\"syscalls2\", \"on_sys_open_return\") def my_fun(cpu, pc, filename, flags, mode):  . panda.disable_ppp(\"my_fun\")    OR    @ppp(\"syscalls2\", \"on_sys_open_return\", name=\"custom\") def my_fun(cpu, pc, filename, flags, mode):  .   panda.disable_ppp(\"custom\")",
"func":1
},
{
"ref":"pandare.panda.Panda.set_breakpoint",
"url":4,
"doc":"Set a GDB breakpoint such that when the guest hits PC, execution is paused and an attached GDB instance can introspect on guest memory. Requires starting panda with -s, at least for now",
"func":1
},
{
"ref":"pandare.panda.Panda.clear_breakpoint",
"url":4,
"doc":"Remove a breakpoint",
"func":1
},
{
"ref":"pandare.panda.Panda.hook",
"url":4,
"doc":"Decorate a function to setup a hook: when a guest goes to execute a basic block beginning with addr, the function will be called with args (CPUState, TranslationBlock)",
"func":1
},
{
"ref":"pandare.panda.Panda.hook_symbol",
"url":4,
"doc":"Decorate a function to setup a hook: when a guest goes to execute a basic block beginning with addr, the function will be called with args (CPUState, TranslationBlock) Args: libraryname (string): Name of library containing symbol to be hooked. May be None to match any. symbol (string, int): Name of symbol or offset into library to hook kernel (bool): if hook should be applied exclusively in kernel mode name (string): name of hook, defaults to function name cb_type (string): callback-type, defaults to before_tcg_codegen Returns: None: Decorated function is called when (before/after is determined by cb_type) guest goes to call the specified symbol in the specified library.",
"func":1
},
{
"ref":"pandare.panda.Panda.get_best_matching_symbol",
"url":4,
"doc":"Use the dynamic symbols plugin to get the best matching symbol for a given program counter. Args: cpu (CPUState): CPUState structure pc (int): program counter, defaults to current asid (int): ASID, defaults to current",
"func":1
},
{
"ref":"pandare.panda.Panda.enable_hook2",
"url":4,
"doc":"Set a hook2-plugin hook's status to active.  Deprecated Use the hooks plugin instead.",
"func":1
},
{
"ref":"pandare.panda.Panda.disable_hook2",
"url":4,
"doc":"Set a hook2-plugin hook's status to inactive.  Deprecated Use the hooks plugin instead.",
"func":1
},
{
"ref":"pandare.panda.Panda.hook2",
"url":4,
"doc":"Decorator to create a hook with the hooks2 plugin.  Deprecated Use the hooks plugin instead.",
"func":1
},
{
"ref":"pandare.panda.Panda.hook2_single_insn",
"url":4,
"doc":"Helper function to hook a single instruction with the hooks2 plugin.  Deprecated Use the hooks plugin instead.",
"func":1
},
{
"ref":"pandare.panda.Panda.hook_mem",
"url":4,
"doc":"Decorator to hook a memory range with the mem_hooks plugin  todo Fully document mem-hook decorators",
"func":1
},
{
"ref":"pandare.panda.Panda.hook_phys_mem_read",
"url":4,
"doc":"Decorator to hook physical memory reads with the mem_hooks plugin",
"func":1
},
{
"ref":"pandare.panda.Panda.hook_phys_mem_write",
"url":4,
"doc":"Decorator to hook physical memory writes with the mem_hooks plugin",
"func":1
},
{
"ref":"pandare.panda.Panda.hook_virt_mem_read",
"url":4,
"doc":"Decorator to hook virtual memory reads with the mem_hooks plugin",
"func":1
},
{
"ref":"pandare.panda.Panda.hook_virt_mem_write",
"url":4,
"doc":"Decorator to hook virtual memory writes with the mem_hooks plugin",
"func":1
},
{
"ref":"pandare.panda.Panda.arch",
"url":4,
"doc":"A reference to an auto-instantiated  pandare.arch.PandaArch subclass (e.g.,  pandare.arch.X86Arch )"
},
{
"ref":"pandare.taint",
"url":5,
"doc":"Structures to support the taint subsystem."
},
{
"ref":"pandare.taint.TaintQuery",
"url":6,
"doc":""
},
{
"ref":"pandare.taint.TaintQuery.TaintQuery",
"url":6,
"doc":""
},
{
"ref":"pandare.taint.TaintQuery.TaintQuery.get_labels",
"url":6,
"doc":"",
"func":1
},
{
"ref":"pandare.taint.TaintQuery.TaintQuery.reset",
"url":6,
"doc":"",
"func":1
},
{
"ref":"pandare.qcows",
"url":7,
"doc":"Module for fetching generic PANDA images and managing their metadata."
},
{
"ref":"pandare.qcows.Image",
"url":7,
"doc":"The Image class stores information about a supported PANDA image Args: arch (str): Arch for the given architecture. os (str): an os string we can pass to panda with -os prompt (regex): a regex to detect a bash prompt after loading the snapshot and sending commands cdrom (str): name to use for cd-drive when inserting an ISO via monitor qcow (str): optional name to save qcow as url (str): url to download the qcow (e.g. https: website.com/yourqcow.qcow2) default_mem (str): memory to use for the root snapshot (e.g. 1G) extra_files (list): other files (assumed to be in same directory on server) that we also need extra_args (list): Extra arguments to pass to PANDA (e.g. ['-display', 'none'])"
},
{
"ref":"pandare.qcows.SUPPORTED_IMAGES",
"url":7,
"doc":"Dictionary of  Image objects by name. Supported values include: x86_64 i386 ppc arm aarch64 mips mipsel"
},
{
"ref":"pandare.qcows.Qcows",
"url":7,
"doc":"Helper library for managing qcows on your filesystem. Given an architecture, it can download a qcow from  panda.mit.edu to  ~/.panda/ and then use that. Alternatively, if a path to a qcow is provided, it can just use that. A qcow loaded by architecture can then be queried to get the name of the root snapshot or prompt."
},
{
"ref":"pandare.qcows.Qcows.get_qcow_info",
"url":7,
"doc":"Get information about supported image as specified by name. Args: name (str): String idenfifying a qcow supported Returns: Image: Instance of the Image class for a qcow",
"func":1
},
{
"ref":"pandare.qcows.Qcows.get_qcow",
"url":7,
"doc":"Given a generic name of a qcow in  pandare.qcows.SUPPORTED_IMAGES or a path to a qcow, return the path. Defaults to i386 Args: name (str): generic name or path to qcow Returns: string: Path to qcow",
"func":1
},
{
"ref":"pandare.qcows.Qcows.qcow_from_arg",
"url":7,
"doc":"Given an index into argv, call get_qcow with that arg if it exists, else with None Args: idx (int): an index into argv Returns: string: Path to qcow",
"func":1
},
{
"ref":"pandare.panda_expect",
"url":8,
"doc":"Custom library for interacting/expecting data via serial-like FDs"
},
{
"ref":"pandare.panda_expect.TimeoutExpired",
"url":8,
"doc":"Common base class for all non-exit exceptions."
},
{
"ref":"pandare.panda_expect.Expect",
"url":8,
"doc":"Class to manage typing commands into consoles and waiting for responses. Designed to be used with the qemu monitor and serial consoles for Linux guests. To debug, set logfile_base to something like '/tmp/log' and then look at logs written to /tmp/log_monitor.txt and /tmp/log_serial.txt. Or directyl access"
},
{
"ref":"pandare.panda_expect.Expect.update_expectation",
"url":8,
"doc":"",
"func":1
},
{
"ref":"pandare.panda_expect.Expect.set_logging",
"url":8,
"doc":"",
"func":1
},
{
"ref":"pandare.panda_expect.Expect.connect",
"url":8,
"doc":"",
"func":1
},
{
"ref":"pandare.panda_expect.Expect.is_connected",
"url":8,
"doc":"",
"func":1
},
{
"ref":"pandare.panda_expect.Expect.abort",
"url":8,
"doc":"",
"func":1
},
{
"ref":"pandare.panda_expect.Expect.consume_partial",
"url":8,
"doc":"Get the message so far and reset. To ensure that we're not consuming the final line at we just don't clear",
"func":1
},
{
"ref":"pandare.panda_expect.Expect.get_partial",
"url":8,
"doc":"Get the message",
"func":1
},
{
"ref":"pandare.panda_expect.Expect.unansi",
"url":8,
"doc":"Take the string in self.current_line and any prior lines in self.prior_lines and render ANSI. prior lines should be plain strings while current_line may contain escapes Given a string with ansi control codes, emulate behavior to generate the resulting string. First we split input into a list of ('fn', [args]) / ('text', ['foo']) ansi commands then evaluate the commands to render real text output See https: notes.burke.libbey.me/ansi-escape-codes/ and http: ascii-table.com/ansi-escape-sequences-vt-100.php for ansi escape code details",
"func":1
},
{
"ref":"pandare.panda_expect.Expect.expect",
"url":8,
"doc":"Assumptions: as you send a command, the guest may send back The same command + ansi control codes. The epxectation value will show up on the start of a line. We add characters into current_line as we recv them. At each newline we 1) Render ANSI control characters in current line (may affect prior lines) 2) Check if the line we just parsed matches the provided expectation (if so we're done) 3) Append current_line into prior_lines",
"func":1
},
{
"ref":"pandare.panda_expect.Expect.send",
"url":8,
"doc":"",
"func":1
},
{
"ref":"pandare.panda_expect.Expect.send_eol",
"url":8,
"doc":"",
"func":1
},
{
"ref":"pandare.panda_expect.Expect.sendline",
"url":8,
"doc":"",
"func":1
},
{
"ref":"pandare.extras",
"url":9,
"doc":"Extras are PyPANDA plugins which you can import into other python analyses. Typically this is done by passing a handle from your script's PANDA object to the plugin."
},
{
"ref":"pandare.extras.FakeFile",
"url":9,
"doc":"A fake file behind a hyperFD - this class will generate data when the corresponding file descriptor(s) are accessed. Users can inherit and modify this to customize how data is generated Note: a single FileFaker might be opened and in use by multiple FDs in the guest"
},
{
"ref":"pandare.extras.FakeFile.read",
"url":9,
"doc":"Generate data for a given read of size. Returns data.",
"func":1
},
{
"ref":"pandare.extras.FakeFile.write",
"url":9,
"doc":"Update contents from offset. It's a bytearray so we can't just mutate Return how much HyperFD offset should be incremented by XXX what about writes past end of the file?",
"func":1
},
{
"ref":"pandare.extras.FakeFile.close",
"url":9,
"doc":"",
"func":1
},
{
"ref":"pandare.extras.FakeFile.get_mode",
"url":9,
"doc":"",
"func":1
},
{
"ref":"pandare.extras.FakeFile.get_size",
"url":9,
"doc":"",
"func":1
},
{
"ref":"pandare.extras.FileFaker",
"url":9,
"doc":"Class to halucinate fake files within the guest. When the guest attempts to access a faked file, we transparenly redirect the access to another file on disk and grab the FD generated using FileHook. When the guest attempts to use a FD related to a faked file, we mutate the request. Reads are created from fake conents and writes are logged. Initialize FileHook and vars. Setup callbacks for all fd-based syscalls"
},
{
"ref":"pandare.extras.FileFaker.replace_file",
"url":9,
"doc":"Replace all accesses to filename with accesses to the fake file instead which optionally may be specified by disk_file.",
"func":1
},
{
"ref":"pandare.extras.FileFaker.close",
"url":9,
"doc":"",
"func":1
},
{
"ref":"pandare.extras.FileFaker.rename_file",
"url":10,
"doc":"Mutate a given filename into a new name at the syscall interface",
"func":1
},
{
"ref":"pandare.extras.FileHook",
"url":9,
"doc":"Class to modify guest memory just before syscalls with filename arguments. As the system call is about to be executed, change the data pointed to by the filename pointer. When the syscall returns, restore the mutated data to its original values. This provides a simple, cross-platform interface to redirect file accesses just using the OSI plugin. usage: panda = Panda( .) hook = FileHook(panda) hook.rename_file(\"/rename_this\", \"/to_this\") Store a reference to the panda object, and register the appropriate syscalls2 callbacks for entering and exiting from all syscalls that have a char filename argument."
},
{
"ref":"pandare.extras.FileHook.rename_file",
"url":9,
"doc":"Mutate a given filename into a new name at the syscall interface",
"func":1
},
{
"ref":"pandare.extras.IoctlFaker",
"url":9,
"doc":"Interpose ioctl() syscall returns, forcing successes for specific error codes to simulate missing drivers/peripherals. Bin all returns into failures (needed forcing) and successes, store for later retrival/analysis. Log enables/disables logging. ignore contains a list of tuples (filename, cmd ) to be ignored. intercept_ret_vals is a list of ioctl return values that should be intercepted. By default we just intercept just -25 which indicates that a driver is not present to handle the ioctl. intercept_all_non_zero is aggressive setting that takes precedence if set - any non-zero return code id changed to zero."
},
{
"ref":"pandare.extras.IoctlFaker.get_forced_returns",
"url":9,
"doc":"Retrieve ioctls whose error codes where overwritten",
"func":1
},
{
"ref":"pandare.extras.IoctlFaker.get_unmodified_returns",
"url":9,
"doc":"Retrieve ioctl that completed normally",
"func":1
},
{
"ref":"pandare.extras.ModeFilter",
"url":9,
"doc":"Simple, inheritable class to provide a decorator to enable/disable callbacks depending on self.mode value. It is ill-advised to use on callbacks with high-performance impacts such as before_block_exec as this is a pure-Python plugin. Example: from pandare import Panda from pandare.extras import ModeFilter class MyClass(ModeFilter): def __init__(self, panda) self.panda = panda self.set_mode(\"mode1\") @self.mode_filter(\"mode1\") @self.panda.ppp(\"syscalls2\", \"on_sys_open_enter\") def on_open(cpu, pc, fname_ptr, flags, mode):  assert(self.mode  \"mode1\")  Note decorator ensures this self.set_mode(\"mode2\")  Change mode - so this callback won't run again  . def run(self): self.panda.run() p = panda( .) mc = MyClass(panda) mc.run()"
},
{
"ref":"pandare.extras.ModeFilter.mode",
"url":9,
"doc":""
},
{
"ref":"pandare.extras.ModeFilter.mode_filter",
"url":9,
"doc":"Decorator to only run a function if self.mode matches the provided string",
"func":1
},
{
"ref":"pandare.extras.ModeFilter.set_mode",
"url":9,
"doc":"Helper to change mode",
"func":1
},
{
"ref":"pandare.extras.ProcWriteCapture",
"url":9,
"doc":"Set console_capture = True to capture all console output to file, including boot messages. Set proc_name = \"name_of_proc\" to, for a named process, capture stdout/stderr and any file writes from the hypervisor, mirror results to log directory. Can be stacked with console capture."
},
{
"ref":"pandare.extras.ProcWriteCapture.proc_printed_err",
"url":9,
"doc":"",
"func":1
},
{
"ref":"pandare.extras.ProcWriteCapture.console_printed_post_boot_err",
"url":9,
"doc":"",
"func":1
},
{
"ref":"pandare.extras.ProcWriteCapture.get_files_written",
"url":9,
"doc":"",
"func":1
},
{
"ref":"pandare.extras.modeFilter",
"url":11,
"doc":"Simple helper and example to selectively execute callbacks based on a mode string"
},
{
"ref":"pandare.extras.modeFilter.ModeFilter",
"url":11,
"doc":"Simple, inheritable class to provide a decorator to enable/disable callbacks depending on self.mode value. It is ill-advised to use on callbacks with high-performance impacts such as before_block_exec as this is a pure-Python plugin. Example: from pandare import Panda from pandare.extras import ModeFilter class MyClass(ModeFilter): def __init__(self, panda) self.panda = panda self.set_mode(\"mode1\") @self.mode_filter(\"mode1\") @self.panda.ppp(\"syscalls2\", \"on_sys_open_enter\") def on_open(cpu, pc, fname_ptr, flags, mode):  assert(self.mode  \"mode1\")  Note decorator ensures this self.set_mode(\"mode2\")  Change mode - so this callback won't run again  . def run(self): self.panda.run() p = panda( .) mc = MyClass(panda) mc.run()"
},
{
"ref":"pandare.extras.modeFilter.ModeFilter.mode",
"url":11,
"doc":""
},
{
"ref":"pandare.extras.modeFilter.ModeFilter.mode_filter",
"url":11,
"doc":"Decorator to only run a function if self.mode matches the provided string",
"func":1
},
{
"ref":"pandare.extras.modeFilter.ModeFilter.set_mode",
"url":11,
"doc":"Helper to change mode",
"func":1
},
{
"ref":"pandare.extras.modeFilter.Tester",
"url":11,
"doc":"Test class to drive a guest running a few commands while using mode filters for syscalls analyses"
},
{
"ref":"pandare.extras.modeFilter.Tester.run_guest",
"url":11,
"doc":"Run guest",
"func":1
},
{
"ref":"pandare.extras.modeFilter.Tester.mode_filter",
"url":11,
"doc":"Decorator to only run a function if self.mode matches the provided string",
"func":1
},
{
"ref":"pandare.extras.modeFilter.Tester.set_mode",
"url":11,
"doc":"Helper to change mode",
"func":1
},
{
"ref":"pandare.extras.ioctlFaker",
"url":12,
"doc":""
},
{
"ref":"pandare.extras.ioctlFaker.do_ioctl_init",
"url":12,
"doc":"One-time init for arch-specific bit-packed ioctl cmd struct.",
"func":1
},
{
"ref":"pandare.extras.ioctlFaker.Ioctl",
"url":12,
"doc":"Unpacked ioctl command with optional buffer. Do unpacking, optionally using OSI for process and file name info."
},
{
"ref":"pandare.extras.ioctlFaker.Ioctl.get_ret_code",
"url":12,
"doc":"' Helper retrive original return code, handles arch-specifc ABI",
"func":1
},
{
"ref":"pandare.extras.ioctlFaker.IoctlFaker",
"url":12,
"doc":"Interpose ioctl() syscall returns, forcing successes for specific error codes to simulate missing drivers/peripherals. Bin all returns into failures (needed forcing) and successes, store for later retrival/analysis. Log enables/disables logging. ignore contains a list of tuples (filename, cmd ) to be ignored. intercept_ret_vals is a list of ioctl return values that should be intercepted. By default we just intercept just -25 which indicates that a driver is not present to handle the ioctl. intercept_all_non_zero is aggressive setting that takes precedence if set - any non-zero return code id changed to zero."
},
{
"ref":"pandare.extras.ioctlFaker.IoctlFaker.get_forced_returns",
"url":12,
"doc":"Retrieve ioctls whose error codes where overwritten",
"func":1
},
{
"ref":"pandare.extras.ioctlFaker.IoctlFaker.get_unmodified_returns",
"url":12,
"doc":"Retrieve ioctl that completed normally",
"func":1
},
{
"ref":"pandare.extras.procWriteCapture",
"url":13,
"doc":""
},
{
"ref":"pandare.extras.procWriteCapture.ProcWriteCapture",
"url":13,
"doc":"Set console_capture = True to capture all console output to file, including boot messages. Set proc_name = \"name_of_proc\" to, for a named process, capture stdout/stderr and any file writes from the hypervisor, mirror results to log directory. Can be stacked with console capture."
},
{
"ref":"pandare.extras.procWriteCapture.ProcWriteCapture.proc_printed_err",
"url":13,
"doc":"",
"func":1
},
{
"ref":"pandare.extras.procWriteCapture.ProcWriteCapture.console_printed_post_boot_err",
"url":13,
"doc":"",
"func":1
},
{
"ref":"pandare.extras.procWriteCapture.ProcWriteCapture.get_files_written",
"url":13,
"doc":"",
"func":1
},
{
"ref":"pandare.extras.fileFaker",
"url":14,
"doc":"Framework for halucinating files inside the guest through modifications around syscalls involving filenames and file descriptors. High-level idea: When we see an open of a file we want to fake, change it to another filename that really exists and capture the file descriptor assigned to it. Then whenever there are uses of that file descriptor, ignore/drop the request and fake return values."
},
{
"ref":"pandare.extras.fileFaker.FakeFile",
"url":14,
"doc":"A fake file behind a hyperFD - this class will generate data when the corresponding file descriptor(s) are accessed. Users can inherit and modify this to customize how data is generated Note: a single FileFaker might be opened and in use by multiple FDs in the guest"
},
{
"ref":"pandare.extras.fileFaker.FakeFile.read",
"url":14,
"doc":"Generate data for a given read of size. Returns data.",
"func":1
},
{
"ref":"pandare.extras.fileFaker.FakeFile.write",
"url":14,
"doc":"Update contents from offset. It's a bytearray so we can't just mutate Return how much HyperFD offset should be incremented by XXX what about writes past end of the file?",
"func":1
},
{
"ref":"pandare.extras.fileFaker.FakeFile.close",
"url":14,
"doc":"",
"func":1
},
{
"ref":"pandare.extras.fileFaker.FakeFile.get_mode",
"url":14,
"doc":"",
"func":1
},
{
"ref":"pandare.extras.fileFaker.FakeFile.get_size",
"url":14,
"doc":"",
"func":1
},
{
"ref":"pandare.extras.fileFaker.HyperFD",
"url":14,
"doc":"A HyperFD is what we use to track the state of a faked FD in the guest. It is backed by a FakeFile. Stores the filename originally associated with it at time of open"
},
{
"ref":"pandare.extras.fileFaker.HyperFD.read",
"url":14,
"doc":"Read from the file descriptor. Determine current offset and then pass request through to FakeFile Returns (data read, count)",
"func":1
},
{
"ref":"pandare.extras.fileFaker.HyperFD.write",
"url":14,
"doc":"",
"func":1
},
{
"ref":"pandare.extras.fileFaker.HyperFD.get_mode",
"url":14,
"doc":"",
"func":1
},
{
"ref":"pandare.extras.fileFaker.HyperFD.get_size",
"url":14,
"doc":"",
"func":1
},
{
"ref":"pandare.extras.fileFaker.HyperFD.close",
"url":14,
"doc":"Decrement the reference counter",
"func":1
},
{
"ref":"pandare.extras.fileFaker.HyperFD.seek",
"url":14,
"doc":"",
"func":1
},
{
"ref":"pandare.extras.fileFaker.FileFaker",
"url":14,
"doc":"Class to halucinate fake files within the guest. When the guest attempts to access a faked file, we transparenly redirect the access to another file on disk and grab the FD generated using FileHook. When the guest attempts to use a FD related to a faked file, we mutate the request. Reads are created from fake conents and writes are logged. Initialize FileHook and vars. Setup callbacks for all fd-based syscalls"
},
{
"ref":"pandare.extras.fileFaker.FileFaker.replace_file",
"url":14,
"doc":"Replace all accesses to filename with accesses to the fake file instead which optionally may be specified by disk_file.",
"func":1
},
{
"ref":"pandare.extras.fileFaker.FileFaker.close",
"url":14,
"doc":"",
"func":1
},
{
"ref":"pandare.extras.fileFaker.FileFaker.rename_file",
"url":10,
"doc":"Mutate a given filename into a new name at the syscall interface",
"func":1
},
{
"ref":"pandare.extras.fileHook",
"url":10,
"doc":""
},
{
"ref":"pandare.extras.fileHook.FileHook",
"url":10,
"doc":"Class to modify guest memory just before syscalls with filename arguments. As the system call is about to be executed, change the data pointed to by the filename pointer. When the syscall returns, restore the mutated data to its original values. This provides a simple, cross-platform interface to redirect file accesses just using the OSI plugin. usage: panda = Panda( .) hook = FileHook(panda) hook.rename_file(\"/rename_this\", \"/to_this\") Store a reference to the panda object, and register the appropriate syscalls2 callbacks for entering and exiting from all syscalls that have a char filename argument."
},
{
"ref":"pandare.extras.fileHook.FileHook.rename_file",
"url":10,
"doc":"Mutate a given filename into a new name at the syscall interface",
"func":1
}
]