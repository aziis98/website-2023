---
layout: ../../layouts/ArticleLayout.astro
title: 5 lines of bash in, go project out
description: Yet another insane mini project made with the help of ChatGPT. This is a small golang tcp server that returns some system stats and is statically compiled for arm64 using GitHub Actions
tags: ["go", "tcp", "chatgpt", "actions", "side-project", "lang-en"]
publish_date: 2023/12/25
---

# 5 lines of bash in, go project out

This is another tale of [a small project I made](https://github.com/aziis98/go-stats-server) in Go with the help of ChatGPT, I'm yet again amazed by the power of this tool that this time helped me translate 5 bash commands into a small Go program (and full project actually as we will see). 

Here is the full conversation if you are interested, I will borrow some snippets from it in this article with minor edits for clarity.

> The whole conversation: <https://chat.openai.com/share/40247aa0-76e9-4d9a-b0fa-356a5f51f208>

## The problem

Last year we had a university project where we had to build a small cluster of Rock 4 boards (it has the same chip as the Raspberry Pi 4) and we started building a small dashboard to monitor the status of the cluster. 

Recently our professor setup a Grafana + Prometheus dashboard to monitor the cluster, Grafana is a great tool but it's a bit overkill for our use case and we wanted to keep the custom dashboard we made as it's more lightweight and we can customize it as we want.

So [BachoSeven](https://github.com/BachoSeven) (another member of PHC) made the following commands to manually take some stats of each node of the cluster (there are 20 nodes in total + 1 master node). [GNU Parallel](https://www.gnu.org/software/parallel/) is a great tool in this case as it allows to run the same command on multiple machines in parallel (not really sadly, maybe we missed some options, but it's still faster than doing it manually).

```bash
parallel --nonall --slf nodes.txt 'echo $HOSTNAME $(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | sed "s/^/100 - /" | bc)'
parallel --nonall --slf nodes.txt 'echo $HOSTNAME $(free -m | awk '\''/Mem/{print $3" "$2}'\'')'
parallel --nonall --slf nodes.txt 'echo $HOSTNAME $(cat /sys/class/net/[e]*/statistics/{r,t}x_bytes)'
parallel --nonall --slf nodes.txt 'echo $HOSTNAME $(df -Ph | grep mmcblk0p5 | awk '\''{print $2" "$3}'\'' | sed '\''s/G//g'\'')'
parallel --nonall --slf nodes.txt 'echo $HOSTNAME $(cut -f1 -d. /proc/uptime)'
```

Parallel internally uses ssh to connect to the machines and run the commands. However this was very slow and we had to wait a lot for the output (about ~6s for each command). This is not really on par with the "lightweight" dashboard we wanted, we also didn't know about any other software to lightly log metrics from multiple linux machines, so I thought I could _just make a small TCP server that runs these commands locally and returns the output when requested_ (hold that thought, this is all the blog post essentially). 

This way we can just let the tcp servers run on each node and have our custom dashboard make some requests.

This idea is what sparked the conversation with ChatGPT that helped me make this small project. The first thing I asked was to remove the call to `parallel` from the commands to unquote them.

> Me: Remove gnu parallel from the following commands

```bash
# ChatGPT:
echo $(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | sed "s/^/100 - /" | bc)
echo $(free -m | awk '/Mem/{print $3" "$2}')
echo $(cat /sys/class/net/[e]*/statistics/{r,t}x_bytes)
echo $(df -Ph | grep mmcblk0p5 | awk '{print $2" "$3}' | sed 's/G//g')
echo $(cut -f1 -d. /proc/uptime)
```

At this point I tried to make what I had in mind directly in bash

> Me: Wrap the previous snippet in a bigger shell script, where each line from before becomes a subcommand, the names in order are: cpu, memory, network, storage and uptime


```bash
# ChatGPT:

# Subcommand: cpu
cpu() {
    echo $(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | sed "s/^/100 - /" | bc)
}

# Subcommand: memory
memory() {
    echo $(free -m | awk '/Mem/{print $3" "$2}')
}

# Subcommand: network
network() {
    echo $(cat /sys/class/net/[e]*/statistics/{r,t}x_bytes)
}

# Subcommand: storage
storage() {
    echo $(df -Ph | grep mmcblk0p5 | awk '{print $2" "$3}' | sed 's/G//g')
}

# Subcommand: uptime
uptime() {
    echo $(cut -f1 -d. /proc/uptime)
}

# Main script
cpu_result=$(cpu)
memory_result=$(memory)
network_result=$(network)
storage_result=$(storage)
uptime_result=$(uptime)

echo "CPU: $cpu_result"
echo "Memory: $memory_result"
echo "Network: $network_result"
echo "Storage: $storage_result"
echo "Uptime: $uptime_result"
```

This was a good start even if it missed that by subcommand I meant that it should use "$1" to select the subcommand to run. Then I directly started to tell it to make a tcp server in bash that responded to those keywords

> Me: Now wrap all in a small tcp server that for example when receiving "cpu" it return the output of the cpu function and so on

```bash
# ChatGPT:

# Subcommand: cpu
cpu() {
    echo $(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | sed "s/^/100 - /" | bc)
}

# Subcommand: memory
memory() {
    echo $(free -m | awk '/Mem/{print $3" "$2}')
}

# Subcommand: network
network() {
    echo $(cat /sys/class/net/[e]*/statistics/{r,t}x_bytes)
}

# Subcommand: storage
storage() {
    echo $(df -Ph | grep mmcblk0p5 | awk '{print $2" "$3}' | sed 's/G//g')
}

# Subcommand: uptime
uptime() {
    echo $(cut -f1 -d. /proc/uptime)
}

# TCP Server
while true; do
    # Listen on port 12345
    { echo -ne "HTTP/1.1 200 OK\r\n\r\n"; while true; do
        # Read the command from the client
        read -r cmd
        case $cmd in
            "cpu") echo -ne "$(cpu)\r\n";;
            "memory") echo -ne "$(memory)\r\n";;
            "network") echo -ne "$(network)\r\n";;
            "storage") echo -ne "$(storage)\r\n";;
            "uptime") echo -ne "$(uptime)\r\n";;
            "exit") exit;;
            *) echo -ne "Invalid command\r\n";;
        esac
    done } | nc -l -p 12345 -q 1
done
```

And the result was pretty good! I knew about netcat but I would have took me ages to write the following. For some reason it added the `-q 1` option and sent an initial HTTP header but it was a good start.

> Me:
> - you do not need to return a valid http response, this is a custom protocol
> - you do not need to call echo $(command), that's the same as just command

Actually here I was wrong, `echo $(command)` is not the same as `command` as the former will remove all the newlines from the output of the command. This is a problem as we want to send the output of the command inline to the client. I will later fix this directly in Go.

```bash
# ChatGPT:

# Subcommand: cpu
cpu() {
    top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | sed "s/^/100 - /" | bc
}

# Subcommand: memory
memory() {
    free -m | awk '/Mem/{print $3" "$2}'
}

# Subcommand: network
network() {
    cat /sys/class/net/[e]*/statistics/{r,t}x_bytes
}

# Subcommand: storage
storage() {
    df -Ph | grep mmcblk0p5 | awk '{print $2" "$3}' | sed 's/G//g'
}

# Subcommand: uptime
uptime() {
    cut -f1 -d. /proc/uptime
}

# TCP Server
while true; do
    { 
        while IFS= read -r cmd; do
            case $cmd in
                "cpu") cpu;;
                "memory") memory;;
                "network") network;;
                "storage") storage;;
                "uptime") uptime;;
                "exit") exit;;
                *) echo "Invalid command";;
            esac
        done
    } | nc -l -p 12345 -q 1
done
```

This is better. Let's now get to the Go part. A great use of ChatGPT I have found recently is to use it to convert bash scripts to other (more serious) languages.

> Me: Now convert it to a small golang program and show me how to statically compile it. Remember to return the command output to the client as a response

```go
// ChatGPT:

package main

import (
	"bufio"
	"fmt"
	"net"
	"os"
	"os/exec"
	"strings"
)

func ExecuteCommand(command string) string {
	cmd := exec.Command("bash", "-c", command)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Sprintf("Error: %s", err)
	}
	return string(output)
}

func handleConnection(conn net.Conn) {
	defer conn.Close()

	scanner := bufio.NewScanner(conn)
	for scanner.Scan() {
		command := scanner.Text()

		switch command {
		case "cpu":
			fmt.Fprintln(conn, ExecuteCommand("top -bn1 | grep \"Cpu(s)\" | sed \"s/.*, *\\([0-9.]*\\)%* id.*/\\1/\" | sed \"s/^/100 - /\" | bc"))
		case "memory":
			fmt.Fprintln(conn, ExecuteCommand("free -m | awk '/Mem/{print $3\" \"$2}'"))
		case "network":
			fmt.Fprintln(conn, ExecuteCommand("cat /sys/class/net/[e]*/statistics/{r,t}x_bytes"))
		case "storage":
			fmt.Fprintln(conn, ExecuteCommand("df -Ph | grep mmcblk0p5 | awk '{print $2\" \"$3}' | sed 's/G//g'"))
		case "uptime":
			fmt.Fprintln(conn, ExecuteCommand("cut -f1 -d. /proc/uptime"))
		case "exit":
			return
		default:
			fmt.Fprintln(conn, "Invalid command")
		}
	}
}

func main() {
	ln, err := net.Listen("tcp", ":12345")
	if err != nil {
		fmt.Println("Error:", err)
		os.Exit(1)
	}
	defer ln.Close()

	for {
		conn, err := ln.Accept()
		if err != nil {
			fmt.Println("Error:", err)
			continue
		}

		go handleConnection(conn)
	}
}
```

And it also showed how to compile the program

```bash
$ GOOS=linux GOARCH=amd64 go build -o server main.go
```

> Me: Actually compile it to a static binary without any linked deps

```bash
CGO_ENABLED=0 GOOS=linux go build -a -ldflags '-s -w' -o server main.go
```

But as I'm lazy and didn't wanna compile this locally on all the nodes I just made it cross-compile with `GOARCH=arm64` and to try another new thing I setup a GitHub workflow to automatically build the program and make a release on every tag pushed to the repo.

> Me: Now write a github workflow for building an artifact and release of this 

```yaml
name: Build and Release

on:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v2

      - name: Set up Go
        uses: actions/setup-go@v2
        with:
          go-version: 1.16

      - name: Build
        run: |
          CGO_ENABLED=0 GOOS=linux go build -a -ldflags '-s -w' -o server

  release:
    runs-on: ubuntu-latest

    needs: build

    steps:
      - name: Create Release
        id: create_release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            server
          token: ${{ secrets.GITHUB_TOKEN }}

  upload-artifact:
    runs-on: ubuntu-latest

    needs: release

    steps:
      - name: Archive Artifact
        uses: actions/upload-artifact@v2
        with:
          name: server
          path: server
```

This is were things started to not really work on first try, first I had to add the correct architecture to the build command. Then I also discovered that `actions/checkout@v2` and `softprops/action-gh-release@v2` are a bit outdated and I had to read the docs use the `v4` versions for both.

In the end I updated the workflow to the following

```yaml
name: Build and Release

on:
    push:
        tags:
            - 'v*.*.*'

jobs:
    build:
        runs-on: ubuntu-latest
        permissions:
            contents: write
        steps:
            - name: Checkout Repository
              uses: actions/checkout@v4

            - name: Set up Go
              uses: actions/setup-go@v4
              with:
                  go-version-file: './go.mod'

            - name: Build
              run: |
                  CGO_ENABLED=0 GOARCH=arm64 go build -a -ldflags '-s -w' -o ./out/stats-server

            - name: Create Release
              id: create_release
              uses: softprops/action-gh-release@v1
              with:
                  files: ./out/stats-server
                  token: ${{ secrets.GITHUB_TOKEN }}
```

Oh and the artifact wasn't really needed as [the release action can already uploads the binary as an asset](https://github.com/softprops/action-gh-release#%EF%B8%8F-uploading-release-assets). The Golang version can also be extracted dynamically from the `go.mod` file without hardcoding it in the workflow, so I added that too. Another important thing is that the `contents: write` permission is needed to be able to push the release tag.

This is mostly the end of the conversation with ChatGPT, then I asked it to generate a command to download the built binary directly from GitHub

> Me: Now write an example wget command to download this artifact using gnu parallel (use "--slf nodes.txt")

```bash
cat nodes.txt | parallel --slf - 'wget -qO- https://github.com/your-username/your-repo/releases/latest/download/server | tar -xz -C /path/to/destination/'
```

This isn't what I ended up using as the file doesn't need to be untarred, but the link was the correct one. These are the commands I ended up using for downloading the binary on all the nodes

```bash
$ parallel --nonall --slf nodes.txt 'mkdir -p cluster'
$ parallel --nonall --slf nodes.txt 'wget -qO- https://github.com/aziis98/go-stats-server/releases/latest/download/stats-server > ./cluster/stats-server'
$ parallel --nonall --slf nodes.txt 'chmod -v +x ./cluster/stats-server'
```

The last nice touch at this point is to take advantage of the conversation context to **make a nice README** for the project

> Me: Write a nice github readme for this project we just talked about, do not escape markdown code

```markdown
# Go TCP Server with Custom Commands

This Go project implements a simple TCP server that responds to custom commands over the network. The server performs various system-related tasks and provides information such as CPU usage, memory status, network statistics, storage details, and system uptime.

## Usage
...
```

The rest is [in the conversation](https://chat.openai.com/share/40247aa0-76e9-4d9a-b0fa-356a5f51f208) if you are interested.

## Manual bits

At this point I tried executing this on one of the nodes and it worked first try! I was amazed by how easy it was to make this small project with the help of ChatGPT. So I decided to enhance it a bit more.

### Server installation

I wanted to make it easy to install the server on the nodes. One idea was to write a small script that would download the binary from GitHub and install it in the correct place and start it as a service.

But why write the installation script in bash at this point? I could just write those commands in the Go binary itself

```go
var systemdServiceUnit = strings.TrimSpace(`
[Unit]
Description=Stats Server
After=network.target

[Service]
Type=simple
Restart=always
RestartSec=15
ExecStart=/usr/local/bin/stats-server serve

[Install]
WantedBy=default.target
`)
```

First I added this to the program and then I wrote a small function to install the service with the help of Copilot (that also helped me write that systemd unit)

```go
func runCommand(args ...string) error {
	cmd := exec.Command(args[0], args[1:]...)

	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("%w: %s", err, output)
	}

	return nil
}

func setupSystemdService() error {
	...
    if err := runCommand("cp", "-f", os.Args[0], "/usr/local/bin/stats-server"); err != nil {
		return err
	}

	if err := os.WriteFile(
		"/etc/systemd/system/stats-server.service",
		[]byte(systemdServiceUnit),
		os.ModePerm,
	); err != nil {
		return err
	}

	if err := runCommand("systemctl", "daemon-reload"); err != nil {
		return err
	}

	if err := runCommand("systemctl", "enable", "stats-server.service"); err != nil {
		return err
	}

	if err := runCommand("systemctl", "restart", "stats-server.service"); err != nil {
		return err
	}

	return nil
}
```

to recap this does the following things

-  Copy itself to `/usr/local/bin/stats-server` (maybe a bit virus-like but it's a small project and I don't mind)

-  Write the systemd unit to `/etc/systemd/system/stats-server.service` (Copilot suggested me this path as I didn't have a clue about where to place the unit file)

-  Reload the systemd units

-  Enable the service (noop if already enabled)

-  Restart the service (restart is needed as the binary could be already running)

In the end I added a nice cli interface with just a couple of commands

```go
var helpText = strings.TrimSpace(`
usage: stats-server [setup|serve]

This is a simple tcp server that returns system stats, it can be run as a
systemd service or as a standalone server.

protocol commands:
    cpu      returns cpu usage
    memory   returns memory usage
    network  returns network usage
    storage  returns storage usage
    uptime   returns uptime

subcommands:
    setup    auto-install and setup systemd service
    serve    start tcp server

config, environment variables:
    HOST     tcp host to bind to (default: :12345)
`)

func showHelp() {
	fmt.Println(helpText)
	os.Exit(1)
}

func main() {
	if len(os.Args) != 2 {
		showHelp()
	}

	switch os.Args[1] {
	case "setup":
		if err := setupSystemdService(); err != nil {
			log.Fatal(err)
		}
	case "serve":
		if err := startTCPServer(); err != nil {
			log.Fatal(err)
		}
	default:
		showHelp()
	}
}
```

### TCP Server improvements

I made the server host configurable with an environment variable and also added a nice log message when the server starts.

```go
func startTCPServer() error {
	host, ok := os.LookupEnv("HOST")
	if !ok {
		host = ":12345"
	}

	ln, err := net.Listen("tcp", host)
	if err != nil {
		return err
	}
	defer ln.Close()

	log.Printf("listening on %s...", host)
	for {
		conn, err := ln.Accept()
		if err != nil {
			log.Printf("error accepting connection: %s", err)
			continue
		}

		log.Printf("connection from %s", conn.RemoteAddr())
		go handleConnection(conn)
	}
}
```

and the `handleConnection` function with extracted commands for better readability, I also decided that the connection is valid for a single command request and then it gets closed, maybe I will change this in the future if i see that it easy to keep the connection open.

```go
var commands = map[string]string{
	"cpu":     `top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | sed "s/^/100 - /" | bc`,
	"memory":  `free -m | awk '/Mem/{print $3 " " $2}'`,
	"network": `cat /sys/class/net/[e]*/statistics/{r,t}x_bytes`,
	"storage": `df -Ph | grep mmcblk0p5 | awk '{print $2 " " $3}' | sed 's/G//g'`,
	"uptime":  `cut -f1 -d. /proc/uptime`,
}

func handleConnection(conn net.Conn) {
	defer conn.Close()

	scanner := bufio.NewScanner(conn)
	if !scanner.Scan() {
		return
	}

	command := scanner.Text()

	shellCmd, valid := commands[strings.TrimSpace(string(command))]
	if !valid {
		fmt.Fprintln(conn, "invalid command")
		return
	}

	output, err := runShellCommand(shellCmd)
	if err != nil {
		log.Fatal(err)
		return
	}

	fmt.Fprintln(conn, output)
}
```

## Conclusion

And this is how I used ChatGPT to convert 5 lines of bash into a small Go project.

The code is hosted on GitHub at <https://github.com/aziis98/go-stats-server> and mirrored on our PHC Gitea instance at <https://git.phc.dm.unipi.it/aziis98/go-stats-server>.

This was a fun project to make and I'm amazed by how easy it was to start it with the help of ChatGPT. I'm also amazed by how easy it was to make a small TCP server in Go, I may use them more in the future instead of HTTP servers with json APIs when not needed.

I also learned a lot about _systemd_ and still think it's fairly easy to use and configure. I also learned a lot about _GitHub actions_ and how to make a release workflow (that by the way is extremely fast as it takes about ~25s to build the binary and make a release). This was also my first real project that uses a _statically compiled binary_ and I'm amazed by how easy it is to make one with Go.