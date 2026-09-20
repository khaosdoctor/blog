---
title: Automatic OS Updates with Unattended Upgrades
pubDate: 2020-11-11T16:10:23.000Z
updatedDate: 2026-07-16T16:21:31.000Z
category: technology
tags: ["security", "infrastructure", "linux"]
lang: en
description: How about configuring your server so it never needs your input again to install security updates?
seoTitle: Updating VMs Automatically with Unattended Upgrades
seoDescription: How about configuring your server so it never needs your input again to install operating system updates?
slug: automatic-os-updates-unattended-upgrades
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

When we're creating virtual machines, one of the biggest problems we have is keeping our operating systems up to date and free of bugs and security flaws.

In most cases the OS already has an internal system for automatic updates, but when we're using a package-based operating system like, for example, Linux, let's say an Ubuntu 18.4 Server, we have to constantly run commands like `apt update` and `apt upgrade` to install the latest versions of the system packages and thus update to the latest version and fix possible security flaws.

## The problem

The big problem with these approaches is that we constantly need to log into the machine, run the command and log out. To solve that, we have the famous crontabs. We can, for example, run the following command:

```bash
crontab -e
```

To edit our crontab, and then we can add the following line:

```bash
0 3 */5 * * sudo apt update && sudo apt upgrade -y
```

This line will make us run the update commands every 5 days at 3 in the morning. It's good practice to always run the update outside the machine's usage hours, so this time can be set by you without any problems.

In the same way, how often it runs is up to whoever is configuring the machine, I usually run the process every 5 days because we generally don't get big updates daily.

But if we have other updates that need a reboot, for example, Kernel updates, then we'll have to log in and restart the machine manually... There must be a simpler way to do this, right?

## Unattended Upgrades

Ubuntu (and I believe most Debian-based systems) has a package called `unattended-upgrades`, which can be combined with a few other packages to provide a fantastic feature in terms of security and OS updates.

To start, let's remove the crontab we created earlier and leave the system clean again. Then, let's install the following packages:

```bash
sudo apt install -y unattended-upgrades apt-listchanges bsd-mailx
```

`bsd-mailx` will ask for some initial configuration to set up your email, this configuration is specific from machine to machine, but ideally you should pick the `Internet Site` option so you can configure the FQDN of your own domain. If you need to reconfigure the package because it isn't working, use the following command:

```bash
sudo dpkg-reconfigure -plow postfix
```

This will open the configuration window again, and if you prefer to reconfigure using the configuration file, just edit the file `/etc/postfix/main.cf`, and don't forget to restart postfix after saving the file with the command:

```bash
sudo systemctl restart postfix
```

Now, let's enable the package for stable updates using the following command:

```bash
sudo dpkg -plow unattended-upgrades
```

Then we can open the configuration file, use your favorite editor to edit the file `/etc/apt/apt.conf.d/50unattended-upgrades`. This file has all the settings we need to define the package's update behavior, first, let's configure our email so we receive notifications about important updates, and for that we'll set the `Unattended-Upgrade::Mail` key with our chosen email, ending up with `Unattended-Upgrade::Mail "hello@lsantos.dev";`.

Now let's configure a series of other keys so we can get the most out of the package:

```
Unattended-Upgrade::Automatic-Reboot "true";  # Para reiniciar o sistema após uma atualização de Kernel
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot-Time "03:00"; # Que horas queremos que o sistema reinicie
```

Now we can run the command `sudo unattended-upgrades --dry-run` to test whether our settings are correct. This command shouldn't output anything, and if that's the result then everything is fine!

## Conclusion

By installing these packages we can relax a bit about operating system updates and we can also keep our VMs updated in a more concise way.

If you read [the last article about building your own VPN](/criando-uma-vpn/), applying this technique along with [2FA using SSH](/aplicando-two-factor-authentication-no-ssh/) can be a good call to leave your VM running smoothly!

See you around!
