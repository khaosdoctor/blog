---
title: Manage your dotfiles from anywhere with Git
pubDate: 2021-03-23T13:00:00.000Z
updatedDate: 2026-07-16T16:17:37.000Z
category: infra
tags:
  - github
  - git
  - cloud
  - technology
  - virtual machines
  - tips
lang: en
description: Configuring a new computer is one of the most tedious tasks any developer has to do when switching machines, but what if it were much easier?
slug: manage-your-dotfiles-from-anywhere-with-git
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

Setting up a new computer is one of those tasks that is both really cool and really tedious. We have all probably had to switch computers and reconfigure all of our files.

This is a bit tedious for everyone, but it's even more tedious for developers. We have a series of environment configuration files, variables, binary settings, and our precious shells that need to be configured the way we want so we can be as productive as possible!

Let's understand what dotfiles are and how you're going to be much more productive (and your sanity will improve tremendously) when you start versioning them using our beloved Git.

## Dotfiles? Is it edible?

Dotfiles is the name given to a set of [hidden files](https://en.wikipedia.org/wiki/Hidden_file_and_hidden_directory) used to store either state configuration or preference configuration for a tool.

The term "dotfiles" comes, like most things in computing, from the old Unix kernels that adopted the practice of adding a `.` prefix in front of the filename to make that file hidden by default, meaning it was not shown in the `ls` listing. For example, `/home/.hushlogin` is a common Linux file nowadays to remove the login message when you access via SSH.

Since any Unix-based system has a very close relationship with files, as most modules and even devices or network interfaces are shown as files within the file system, they ended up having great importance for software development.

Nowadays, the vast majority of tools use dotfiles to maintain configuration files:

-   Bash: uses `.bashrc`
-   Git: `.gitconfig`, `.gitexcludes`
-   Vim: `.vimrc`

And many others.

## The problem with dotfiles

The big problem with dotfiles is that they are local. That is, whenever you physically switch machines you end up having to configure everything again.

There are [several projects](https://dotfiles.github.io/utilities/) to solve the problem of how we can keep our dotfiles synchronized across machines that have the same operating system. Personally, I don't like any of them and prefer to do my configurations manually, but it can be a great idea to have a tool to help not only store the dotfiles, but also execute and link all of them when it's time to put them to work.

## Managing your dotfiles

To start, create a new repository on your GitHub, we usually call it `dotfiles`. You can also use [some repositories from other people as inspiration](https://dotfiles.github.io/inspiration/), my dotfiles are in [this repository](https://github.com/khaosdoctor/dotfiles), although a bit outdated.

> It's important to say that if your files contain any kind of sensitive data, such as passwords, keys, etc., then you might need to manage them in a private repository, or use tutorials [like this one](https://abdullah.today/encrypted-dotfiles/) to make them encrypted.

But then we run into the question: Which dotfiles should we save? The answer is **all of them**. All configurations that can be transformed into files and saved in Git should be done. In my case I have most of the configuration files for Git, Vim, and ZSH saved as configurations in my repository.

Additionally, on computers with macOS, it's possible to save configurations using a `.macos` file, which became super famous through [Mathias Bynens](https://github.com/mathiasbynens/dotfiles/blob/main/.macos) dotfiles, these files allow you to have a consistent setup across multiple macOS systems.

Also for Mac users, we have [Mackup](https://github.com/lra/mackup) which is a small tool that stores your application configurations in a secure location and then allows you to restore them on a new computer. As well as [BrewBundle](https://github.com/Homebrew/homebrew-bundle) which is a tool that allows you to declaratively describe which apps are installed through Homebrew.

> For the next steps, we're going to need to create some links, so you **cannot** have your files in their original locations. Therefore if you've already created the repository, it's better to **move** the files than to copy them.

## Hard and soft links

After moving all files to a structure you're happy with in your repository, you can use the _hard links_ functionality of Unix-based systems to create a connection between our original file and the location where the dotfile will exist.

Here we enter a discussion about whether we should create a _[soft link](https://en.wikipedia.org/wiki/Symbolic_link)_ (or _symbolic link_) or a _[hard link](https://en.wikipedia.org/wiki/Hard_link)_, personally (and also in [my dotfiles](https://github.com/khaosdoctor/dotfiles/blob/285921ad6ade624e038e549dc95863ffb26c4c37/bootstrap.sh#L25)) I create a hard link between the files.

The main difference between them, however, is the fact that _hard links_ will be a pointer to the file itself, that is, it's a different name for the same original file that is independent of any other system resource, it's like we're saying that a file has multiple names.

This creates great ease when we have to back up these files, because hard links are direct pointers to the original file's content, so if we modify the hard link, we're also modifying the original file, you can test this by doing the following:

```bash
export temp=$(mktemp -d)
touch $temp/original
ln $temp/original ~/hardlink
```

Now edit the file at `~/hardlink`, which is the link itself, and run `cat $temp/original`, see that the content is present there too.

> When deleting the original file, you also need to delete the link, so it's not enough to just run `rm -rf $temp`, you need to also run `rm -rf ~/hardlink`.

Soft links don't allow this to be done, since they are just files that point to other files. Therefore, for dotfiles I much prefer to have a hardlink that allows me to edit my dotfile directly wherever it is and those changes are reflected in my Git repository.

## Creating the links

Now that you already have the repository with the files, all that's left is to link them to their original locations.

> One of the things I like to do when organizing my dotfiles is to keep the original folder structure so I know where to put them later, you can do this if you want.

For this we're going to use the `ln` command, the syntax of this command is:

```bash
ln <original file> <link location>
```

It's important to note that the link location may need to be an absolute path, that is, it cannot be a path like `../` or `~/`, on some systems.

Create a hard link for each of your dotfiles to their original location, for example:

```bash
ln ~/my-dotfiles/home/.gitconfig ~/.gitconfig
```

The command displays no output if everything went well, so the way to verify is to check if, when running an `ls -la` command in your destination directory, the file is present there as well.

> In the case of symbolic links, when running a listing, the command output shows a path like `file -> original file`

## Conclusion

Now, when you're on a new machine, just clone the repository with your dotfiles and run the linking for each of them.

You can make this easier with a [bootstrap script](https://github.com/khaosdoctor/dotfiles/blob/master/bootstrap.sh), or even [bootstrap tools](https://dotfiles.github.io/utilities/) that can also download and install dependent programs (like Homebrew) so you only need to turn on the new machine, run a single command, and never again have to configure your preferences.

If you want to know more about dotfiles, take a look at [this site](https://dotfiles.github.io/) which contains a series of tools to safely put your dotfiles online with GitHub, also check out articles like [this one](https://blog.clareglinka.com/2016/01/08/saving-dotfiles-with-symlinks-on-osx/), [this one](https://driesvints.com/blog/getting-started-with-dotfiles/) and [this one](https://zachholman.com/2010/08/dotfiles-are-meant-to-be-forked/) to get an idea of how you can organize and prepare your repositories to receive dotfiles in the best way possible.
