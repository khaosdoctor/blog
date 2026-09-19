---
title: From zero to automation with GitHub Actions in 7 minutes
pubDate: 2020-05-08T03:00:00.000Z
updatedDate: 2026-07-16T16:29:04.000Z
category: infra
tags:
  - containers
  - docker
lang: en
description: How to start from scratch and automate your entire container pipeline in less than 7 minutes! All with GitHub Actions
slug: from-zero-to-github-actions-automation-in-7-minutes
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

In a [previous article](https://dev.to/azure/construindo-e-publicando-um-backend-graphql-completo-sem-escrever-uma-linha-de-codigo-g40), I discussed how we could create a complete GraphQL backend using only a Docker image and a configuration file. All of it hosted on [Azure](https://docs.microsoft.com/azure/container-instances/?WT.mc_id=blog-devto-ludossan). Now let's learn how to automate the deployments to our hosting and automatically update our backend!

This entire project aims to create a backend for my future content archive that will be on [my site](https://lsantos.dev/). But whenever I update the backend or change the GraphQL schema, I'll have to redeploy the entire service.

Instead, I wanted every push to my master branch to generate a new version of the file and send the update to [Azure](https://portal.azure.com/?WT.mc_id=blog-devto-ludossan). But I didn't want to use additional tools for this. I wanted to keep the entire stack as simple as possible. Since we were already using only GitHub and [Azure](https://portal.azure.com/?WT.mc_id=blog-devto-ludossan), it made sense to stick with GitHub for automation.

That's why we'll use [**GitHub Actions**](https://azure.microsoft.com/blog/github-actions-for-azure-is-now-generally-available/?WT.mc_id=blog-devto-ludossan)

Like other CI providers such as Travis or Circle, GitHub also has a repository integration and automation system. The advantage of this system compared to others is that you're already in the same repository and already within the same tool.

The project we'll use to automate is [my public backend repository](https://github.com/khaosdoctor/site-backend):

![](./0-h2hisw4sxqkq0-ck-23eed9.png)

As you can see, the repository is quite simple. It doesn't contain many files, just a `docker-compose.yml` for local testing and our `mongoke` `yml` file which will be the GraphQL schema.

At the top of the page, next to settings, we have the `Actions` button. That's where we'll configure our automation!

![](./0-tmzfh1snxaxb4aji-b6ce13.png)

GitHub already has a series of ready-made workflows, but unfortunately, we don't have one for what we want to do. But what do we want to do? To make everything clearer, let's list all the steps of the process:

1. We receive a push on the `master` branch
2. We connect to [Azure](https://portal.azure.com/?WT.mc_id=blog-devto-ludossan) through a [service principal](https://docs.microsoft.com/azure/app-service/deploy-github-actions?WT.mc_id=blog-devto-ludossan#create-a-service-principal) and an action called [Azure/login](https://github.com/Azure/login)
3. Then we'll use the [Azure/cli](https://github.com/Azure/CLI) action to execute our container deployment command

Some details we need to notice:

- The GitHub Pages cache is quite long, so we'll need to generate a random number or a fingerprint to add to the URL of our Mongoke YAML file
- We have a MongoDB URI that must be a secret

## Creating a secret

First, let's handle our dependencies. The easiest dependency to resolve is creating the MongoDB URL as a secret. To do this, we go to our `Settings` tab and click on `Secrets`. Just add a new secret by clicking the `Add new Secret` link and fill in a name and its content. In our case, we're adding the MongoDB URI, so we'll call this secret `MONGODB_URI`

![](./0-tdihpbbgiwg-3u2-5c517d.png)

## Allowing actions on Azure

To allow GitHub to execute actions on our behalf on [Azure](https://portal.azure.com/?WT.mc_id=blog-devto-ludossan), we need to create a [Service Principal](https://docs.microsoft.com/azure/app-service/deploy-github-actions?WT.mc_id=blog-devto-ludossan#create-a-service-principal). This resource gives us an application account so we can allow other people or services to connect to our portal and perform actions on our behalf.

To create this resource, we'll use the [Azure CLI](https://docs.microsoft.com/cli/azure/install-azure-cli?view=azure-cli-latest&WT.mc_id=blog-devto-ludossan). After logging in with the `az login` command, just run the following command:

<RawEmbed title="Carbon" html="<iframe src=&quot;https://cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fcarbon.now.sh%2Fembed%3Fbg%3Drgba%28171%252C184%252C195%252C0%29%26t%3Ddracula%26wt%3Dnone%26l%3Dauto%26ds%3Dfalse%26dsyoff%3D20px%26dsblur%3D68px%26wc%3Dtrue%26wa%3Dtrue%26pv%3D56px%26ph%3D56px%26ln%3Dfalse%26fl%3D1%26fm%3DFira%2520Code%26fs%3D14px%26lh%3D133%2525%26si%3Dfalse%26es%3D2x%26wm%3Dfalse%26code%3Daz%252520ad%252520sp%252520create-for-rbac%252520--name%252520%25253Cnome-do-SP%25253E%252520--role%252520contributor%252520--scopes%252520%25252Fsubscriptions%25252F%25253CID-da-subscription%25253E%25252FresourceGroups%25252F%25253Cnome-do-resourcegroup%25253E%252520--sdk-auth&amp;display_name=Carbon&amp;url=https%3A%2F%2Fcarbon.now.sh%2F%3Fbg%3Drgba%28171%25252C184%25252C195%25252C0%29%26t%3Ddracula%26wt%3Dnone%26l%3Dauto%26ds%3Dfalse%26dsyoff%3D20px%26dsblur%3D68px%26wc%3Dtrue%26wa%3Dtrue%26pv%3D56px%26ph%3D56px%26ln%3Dfalse%26fl%3D1%26fm%3DFira%252520Code%26fs%3D14px%26lh%3D133%252525%26si%3Dfalse%26es%3D2x%26wm%3Dfalse%26code%3Daz%25252520ad%25252520sp%25252520create-for-rbac%25252520--name%25252520%2525253Cnome-do-SP%2525253E%25252520--role%25252520contributor%25252520--scopes%25252520%2525252Fsubscriptions%2525252F%2525253CID-da-subscription%2525253E%2525252FresourceGroups%2525252F%2525253Cnome-do-resourcegroup%2525253E%25252520--sdk-auth&amp;image=https%3A%2F%2Fcarbon.now.sh%2Fstatic%2Fbrand%2Fbanner.png&amp;key=a19fcc184b9711e1b4764040d3dc5c07&amp;type=text%2Fhtml&amp;scroll=auto&amp;schema=carbon&quot; allowfullscreen=&quot;&quot; frameborder=&quot;0&quot; height=&quot;480&quot; width=&quot;1024&quot; title=&quot;Carbon&quot; class=&quot;eo n ff dy bg&quot; scrolling=&quot;no&quot; style=&quot;box-sizing: inherit; top: 0px; width: 680px; height: 318.75px; position: absolute; left: 0px;&quot;></iframe>" />

To get your subscription ID, just run the `az account list` command and look for the `id` key of the subscription that has the `isDefault` key marked as `true`. You can also give any name to your Service Principal. Make it descriptive so you know who you're granting permissions to.

Finally, another important detail is to only grant permissions to necessary resources. That is, we won't create a Service Principal for the **entire** account, but only for the _Resource Group_ we need. In my case, this RG is called `personal-website` and is where I'm grouping all resources related to my site.

This command should give a JSON response like:

<RawEmbed title="Carbon" html="<iframe src=&quot;https://cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fcarbon.now.sh%2Fembed%3Fbg%3Drgba%28171%252C184%252C195%252C0%29%26t%3Ddracula%26wt%3Dnone%26l%3Dapplication%252Fjson%26ds%3Dfalse%26dsyoff%3D20px%26dsblur%3D68px%26wc%3Dtrue%26wa%3Dtrue%26pv%3D56px%26ph%3D56px%26ln%3Dfalse%26fl%3D1%26fm%3DFira%2520Code%26fs%3D14px%26lh%3D133%2525%26si%3Dfalse%26es%3D2x%26wm%3Dfalse%26code%3D%25257B%25250A%252520%252520%252522clientId%252522%25253A%252520%252522xxxxxxx%252522%25252C%25250A%252520%252520%252522clientSecret%252522%25253A%252520%252522xxxxxxxx%252522%25252C%25250A%252520%252520%252522subscriptionId%252522%25253A%252520%252522xxxxxxxx%252522%25252C%25250A%252520%252520...%25250A%25257D&amp;display_name=Carbon&amp;url=https%3A%2F%2Fcarbon.now.sh%2F%3Fbg%3Drgba%28171%25252C184%25252C195%25252C0%29%26t%3Ddracula%26wt%3Dnone%26l%3Dapplication%25252Fjson%26ds%3Dfalse%26dsyoff%3D20px%26dsblur%3D68px%26wc%3Dtrue%26wa%3Dtrue%26pv%3D56px%26ph%3D56px%26ln%3Dfalse%26fl%3D1%26fm%3DFira%252520Code%26fs%3D14px%26lh%3D133%252525%26si%3Dfalse%26es%3D2x%26wm%3Dfalse%26code%3D%2525257B%2525250A%25252520%25252520%25252522clientId%25252522%2525253A%25252520%25252522xxxxxxx%25252522%2525252C%2525250A%25252520%25252520%25252522clientSecret%25252522%2525253A%25252520%25252522xxxxxxxx%25252522%2525252C%2525250A%25252520%25252520%25252522subscriptionId%25252522%2525253A%25252520%25252522xxxxxxxx%25252522%2525252C%2525250A%25252520%25252520...%2525250A%2525257D&amp;image=https%3A%2F%2Fcarbon.now.sh%2Fstatic%2Fbrand%2Fbanner.png&amp;key=a19fcc184b9711e1b4764040d3dc5c07&amp;type=text%2Fhtml&amp;scroll=auto&amp;schema=carbon&quot; allowfullscreen=&quot;&quot; frameborder=&quot;0&quot; height=&quot;480&quot; width=&quot;1024&quot; title=&quot;Carbon&quot; class=&quot;eo n ff dy bg&quot; scrolling=&quot;no&quot; style=&quot;box-sizing: inherit; top: 0px; width: 680px; height: 318.75px; position: absolute; left: 0px;&quot;></iframe>" />

Copy this entire response and create a new secret in GitHub called `AZURE_CREDENTIALS`:

![](./0-oq5qyamor7ac7i1q-057f23.png)

Now we should have two secrets created:

![](./0-q-riyelrwfa3zxtu-cde0bd.png)

## Creating a workflow

To create our first workflow, we just go back to the `Actions` panel next to `Settings` and click the `Set up this workflow` button:

![](./0-diywmxg2tpj82sm1-a23185.png)

This action should take you to a new screen with an initial code template:

![](./0-v0jnclx9rai2sarx-7a0528.png)

Notice that GitHub Actions are just YAML files that sit in a `<your repo>/.github/workflows` folder, and this will be the name of the workflow. Therefore, it's important that it be quite descriptive. Let's name ours `publish-prod.yml`:

![](./0-i8b-fwsttrzuktlv-7920bd.png)

The content we have is as follows:

![](./1-zexvrp9-lvoptwg5oyzmcq-0d266a.png)

First, let's set a name for our workflow. This will be the name that appears in the GitHub UI, so we can make it a bit prettier:

![](./1-jc3jshv1vu5yravs8zhofq-c72694.png)

Now let's define what type of action we want it to run on. Since we want it to run on any push or PR on the `master` branch, we won't make any changes. But if we needed to change this action, we'd have to change the `on` key. To check what actions are available, just click on the editor and press `ENTER` and an _intellisense_ will be shown:[^n1]

![](./0-bxe5hg2b5h7kil7s-024031.png)

So let's create a section to share environment variables and contents that we'll use later in our script, for example, the container name and also the resource group name. For this we create an `env` block:

![](./1-c-ttd9itkom4cref-j8i6g-f4c3aa.png)

Now let's actually create the machine and what we call a `runner`, which is what will run our test and publishing code. Every workflow is made up of one or more jobs that can be executed sequentially or in parallel. In our case, we don't have to do much, just connect and deploy. So we'll modify the `jobs` section:

![](./1-d2e42tjpqiis6nkobjbm8w-2c2146.png)

We'll run our job on an Ubuntu image. See the other options [in the documentation](https://help.github.com/en/actions/reference/workflow-syntax-for-github-actions#jobsjob_idruns-on). After that, we'll configure our `steps`. A step is a sequence of tasks that will be executed as part of a `job`. That is, this is where we'll run our login and our deployment!

To do this, we'll modify the `steps` key and remove all the content. Then we'll use the ready-made steps from Azure to do the login! We can search for `Azure/login` in the sidebar text box:

![](./0-4bbsyavjq9jdtefl-b2ce5c.png)

When clicking on the step name, we'll have a tutorial on how to use it. In this case, it's quite simple. Just copy the following code into our step:

![](./1-fxk7z3x6sywzaanhprjx2a-48c5c5.png)

And this is where we'll set our first secret. We need the `AZURE_CREDENTIALS` we created earlier to provide the access credentials for login. To use a secret, just put it in double curly braces like: `${{ secrets.AZURE_CREDENTIALS }}`.

Our file looks like this:

![](./1-dgzjwlvnondqne0lielzuq-4b3b72.png)

Let's create a second step that we'll call `Deploy ACI`. This is where we'll run our Azure CLI command. To do this, we'll use another step with the `run` command that will contain the line we'll execute in our CLI. In our case, with the variables already substituted, it will be this:

![](./1-yiclmwwzalr7io2ws26cla-cd19ca.png)

Let's pay close attention to the last part where we create the `MONGOKE_CONFIG_URL` variable. This variable alone won't be enough. We need to concatenate it with the commit SHA value so we don't suffer from caching. To concatenate variables, we have to work only at the step level, since expressions aren't allowed at the job or workflow level. So let's create another step and call it `Create URL`.

In this step, we'll execute a [**Workflow Command**](https://help.github.com/en/actions/reference/workflow-commands-for-github-actions#using-workflow-commands-to-access-toolkit-functions), which are native GitHub Actions commands that can be accessed with the `::command` syntax. In our case, we'll use the `set-env` command, which is used to create a new environment variable. The syntax is as follows: `::set-env name=<name>::<value>` and then we can use concatenation expressions:

![](./1-wwgcattcatvy1njwaug-ca-7677fb.png)

Notice that we're concatenating `${{ env.MONGOKE_CONFIG_URL }}` with `?v=` and taking the first six digits of a [native environment variable](https://help.github.com/pt/actions/configuring-and-managing-workflows/using-environment-variables) called `GITHUB_SHA`. Let's add this step after the login:

![](./1-6nt5gncws6fem5teankfqw-a7f49f.png)

Now let's move to the last step, where we'll run our command with a small change. Instead of using the `MONGOKE_CONFIG_URL` variable, we'll switch to our new `MONGOKE_URL` variable:

![](./1-qqsaniai1089jdwgbh3o8q-f28781.png)

Our final file will look like this:

![](./1-urbn1mgpw9gyrp-xnjvbwg-896711.png)

Now we can click the `Start Commit` button and wait for our action to execute:

![](./0-hcts-h0cjzc1ejo2-910dc3.png)

## Tracking the workflow

We can track our workflow in the `Actions` tab:

![](./0-wb7qzmr5ajrjx-0-a35a35.png)

Remember that **workflows that haven't run won't appear in the list**. Just click on the workflow name to see what happened:

![](./0-mb8osipeyxiwf3bg-34033b.png)

Now we can see in the Azure portal that our container has been updated:

![](./0-5ucncdfkuzajqmzl-0199fd.png)

And our URLs are also correct:

![](./0-sh4pnq2japgdumwd-af035e.png)

## Conclusion

In 7 minutes, we automated the entire deployment process of our application to Azure. Without realizing it, we saved a lot of time with a simple and quick action that can be done in just a few minutes!

In future articles, we'll explore GitHub Actions even more for other tools and distributed application models!

Make sure to follow more of my content on my blog and subscribe to the newsletter to receive weekly updates!

[^n1]: Notice that we have several possible actions. For more details, see [the official documentation](https://help.github.com/en/actions/reference/events-that-trigger-workflows#webhook-events).
