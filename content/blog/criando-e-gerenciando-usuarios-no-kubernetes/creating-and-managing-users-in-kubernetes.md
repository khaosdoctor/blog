---
title: "Creating and managing users in Kubernetes"
pubDate: 2021-02-11T13:00:00.000Z
updatedDate: 2026-07-16T16:18:34.000Z
category: "infra"
tags: ["kubernetes", "aks", "cloud", "azure", "containers", "devops", "docker", "microservices", "security"]
lang: en
description: "Using the same configuration file for all users can be a major problem for your cluster's security! Learn how to create new users to improve the audit trail and security of your applications!"
seoDescription: "Learn how to create new users to improve the audit trail and security of your applications using Kubernetes."
slug: "creating-and-managing-users-in-kubernetes"
machineOwnedTranslation: true
draft: false
heroImage: "./cover-en.png"
---

Kubernetes became quite famous for its ability to manage distributed applications and make container orchestration easy. However, as the system became more widely used, we forgot about fundamental things like the security of our cluster.

## The problem of shared access

One of the conveniences Kubernetes provides us is `kubectl`, its standardized command-line interface and the ability to manage multiple clusters at once makes it tempting to use as the only tool available in a development team.

To provide some context and level everyone's knowledge, `kubectl` works with a file called `config` that usually lives in the `~/.kube` folder, and we call it `kubeconfig`. This file contains the credentials and instructions for how `kubectl` should behave to connect to the clusters listed there. In short, it's the key to all the clusters you have access to.

During my years using Kubernetes and consulting with companies, I've more than once observed situations where cluster access is shared among the entire development team, meaning the same `kubeconfig` is passed around to everyone and even used in automated CI tools.

### But what's the problem?

Just as it's terrible to give your house key to any stranger passing by, it's terrible that everyone on the team has the same access, because even though Kubernetes has an audit tool that lets you know what was done and who made the changes, if all users are `admin`, it becomes difficult to understand what happened.

Furthermore, giving full administrator permissions to anyone who can manipulate the cluster is a recipe for disaster in no time. Many people managing all tools and all namespaces creates a tendency toward lack of control by the cluster administrator.

## Authorization and authentication in Kubernetes

Fortunately, Kubernetes allows us to have a system of authentication and authorization through users, which allows us to create specific access for each person.

Authentication and authorization systems are different, Kubernetes doesn't manage users themselves, but it has native tools to manage their permissions, called `Role`, `ClusterRole`, `RoleBinding`, and `ClusterRoleBinding`, which we'll see in a future article. In other words, user authentication (knowing who is who) and authorization (knowing who can do what) are separate tools that can be managed separately.

### But why do this?

Imagine you work at a large company, like Microsoft, for example. Within companies of this size (or even much smaller ones), we have a very clear division of areas and teams. Each area is responsible for a task or manages one or a series of specific applications.

For example, the team that manages Microsoft Teams is not the same as the one that manages Windows. Although they may need to share resources, one should not have permission to access or manipulate the other's resources.

Bringing this analogy to smaller companies with fewer products, if we have two distinct teams using the same cluster, each team can only have permissions within its own namespace. Additionally, not everyone on the team should have permissions to change certain resources. For example, the management team can modify all resources in a namespace, but a BI team should not be able to write or delete resources, only read them.

All of this is called **RBAC** or (**R**ole **B**ased **A**ccess **C**ontrol), and this is just one of the possibilities we have within AKS to manage users. We'll explore other possibilities in the future.

## How authorization works in Kubernetes

Kubernetes exposes a REST API. It's the one we need to control to prevent unauthorized people from accessing the cluster. That is, just as we protect our APIs from external access, we need to protect our cluster.

To do this, Kubernetes uses this server to authorize requests, evaluating the attributes of that request against a set of policies created by the administrator and gives a boolean response _yes_ or _no_ whether the user can or cannot perform the action. By default, Kubernetes adopts a _deny all_ practice, that is, nobody has permission for anything, they need to be added.

`kubectl` has a command called `auth can-i` to check if a given user can or cannot perform an action within the API, for example:

```bash
$ kubectl auth can-i create pods --namespace production
```

And if you're an administrator, you can combine this command with the `--as` flag to impersonate a user and test permissions for them.

```bash
$ kubectl auth can-i create pods -n production --as lucas
```

### RBAC with AKS

By default, when we create an AKS cluster, RBAC is enabled, that is, we don't need to do anything different to create a cluster with this capability already. In the Azure panel, we have an option that tells us whether or not we can use RBAC for authorization:

![](./Picture1.png)

In this article, we'll only create the users, we won't work on the authorization part yet. That will be for a future article.

To create a cluster using the command line we can do it like this:

```bash
az aks create \
  -n nome \
  -g rg \
  --enable-rbac \
  --generate-ssh-keys \
  --node-count 1
```

## Creating users in Kubernetes

In Kubernetes, we have two concepts of users, as they can be people like you and me, but they can also be other non-human services, like a CI for example. That's why we have a distinction between a `User` and a `ServiceAccount`.

Essentially, a `User` is a concept that **does not exist** within K8S as a valid resource, that is, we don't have a manifest file with `Kind: User` because `User` is not a valid _resource definition_. Users are processes or humans that exist **outside** the cluster, so they are not managed.

In the case of `ServiceAccounts`, we're talking about processes that are dependent on their namespaces and are not human in nature, although we can create SAs for humans as well. These resources exist as a valid _RD_, that is, we have `Kind: ServiceAccount` and we can create one from a Kubernetes manifest file. These are processes **internal** to the cluster and are generally more commonly tied to pods.

In short, both use the authorization API, but we can do this:

```bash
kubectl create serviceaccount minhaconta
```

But we can't do this:

```bash
kubectl create user lucas
```

This means that **Kubernetes does not store or manage user information**. All this identity management is done through common means outside the cluster, the most common way is through digital certificates in X509 format.

### Using certificates

The most common and safest way, as we mentioned before, is to use an X509 certificate to create a user. This certificate is signed by the cluster's CA and allows the user to authenticate to the API using this validation. That is, Kubernetes checks if the request is authenticated with the certificate's key. If yes, it's a trusted user, because only the cluster itself can issue such a certificate.

However, beyond all the cryptographic security of the certificate, the process is quite secure because it requires both the person requesting authorization and the authorizer to participate in the user creation process, which goes something like this:

1.  User generates a private key (or uses their own)
2.  The user generates a new CSR (Certificate Signing Request) with this key and sends it to the administrator
3.  The administrator signs the CSR with the cluster's CA, making it a valid X509 certificate in `CRT` format, and returns the CRT file to the user
4.  The user can use `kubectl` commands to create their user on their machine

### Creating a user

Let's go through the complete process, simulating a created cluster so we can authenticate our user.

First, let's generate a new private key using OpenSSL:

```bash
openssl genrsa -out ./lucas-k8s.key 4096
```

Now we can generate the CSR file:

```bash
openssl req \
  -new 
  -key ./lucas-k8s.key \
  -out ./lucas-k8s-csr \
  -subj "/CN=lucas/O=devs"
```

Here we need to note some important things. First, we're generating the key for a user called `lucas`, which becomes clear when we set the **Common Name (CN)** in the CSR. This field will name our user. Additionally, we have the **Organization (O)** fields. In this case, we're creating a user called `lucas` that's part of the `devs` organization.

For Kubernetes, **CN** is the user's name and **O** are the groups this user belongs to. We'll use this information when we create the **Roles** and **RoleBindings** in future articles.

Now, our user has both the key and the necessary CSR. Let's send these files to our cluster's administrator, who will sign this certificate.

The administrator can SSH into the Kubernetes _control plane_ and sign the certificate manually, which is more difficult but more secure, or create an object called **CertificateSigningRequest** within Kubernetes that tells the cluster it has a CSR to sign with its CA.

The entire CSR object requires a valid CSR file in base64 format, so let's convert our `lucas-k8s.csr` to a new encoding:

```bash
$ cat ./lucas-k8s.csr | base64 | tr -d '\n'
```

Copy the terminal output and let's create a manifest file called `csr.yaml`:

```yaml
apiVersion: certificates.k8s.io/v1beta1
kind: CertificateSigningRequest
metadate:
  name: lucas-csr
spec:
  request: <cole o base64 aqui>
  usages:
    - digital signature
    - key encipherment
    - client auth
```

Now we create this object in the cluster by calling `kubectl apply -f csr.yaml` and we can see what we created using the `kubectl get csr` command:

```output
NAME        AGE    REQUESTOR      CONDITION
lucas-csr    34s   masterclient   Pending
```

Notice that the certificate is _Pending_, this is because every CSR needs operator approval to be created. Let's approve this creation with the command `kubectl certificate lucas-csr approve`. This will generate a confirmation message and then we can run the `kubectl get csr` command again, which will have slightly different output:

```output
NAME        AGE    REQUESTOR      CONDITION
lucas-csr   5m3s   masterclient   Approved,Issued
```

Notice that besides _Approved_, it's also been issued (_Issued_), so we're ready to send this certificate back to our user. To get the certificate, let's execute a neat _oneliner_:

```bash
kubectl get csr lucas-csr \
  -o jsonpath='{.status.certificate}' \
  | base64 -d > lucas-k8s.pem
```

We'll have a new file called `lucas-k8s.pem`. Let's make sure it's valid with the command `openssl x509 -in ./lucas-k8s.pem -text -noout`. This will give us, among other information, the name and expiration dates of the certificate.

### Registering the user in kubeconfig

Now we'll send the certificate back to the user so they can create their user. To do this, we need to work with our `kubeconfig`. Since we don't have two machines, make a copy of your current file so you don't lose data with `mv ~/.kube/config ~/.kube/config.bkp`.

Let's get the AKS base data again using `az aks get-credentials -n cluster -g rg` and we'll use kubectl to create new credentials:

```bash
kubectl config set-credentials lucas \
  --client-key /caminho/para/lucas-k8s.key \
  --client-certificate /caminho/para/lucas-k8s.pem \
  --embed-certs=true
```

Now let's combine the user configuration we just created with the cluster configuration:

```bash
kubectl config set-context lucas \
  --cluster=nome_do_cluster \
  --user=lucas
```

Since we cloned the AKS base image, it comes with administrative access by default. Let's remove the administrator access before sending it to our user:[^n1]

```bash
kubectl config delete-context <nome-do-contexto> 
kubectl config unset users.nome_do_resource-group_nome-do-cluster
```

Now you can test with `kubectl config use-context lucas`. Try running any command. Since we haven't created any permission scheme, it will always return a message:

```output
Error from server (Forbidden): pods is forbidden: User "lucas" cannot ...
```

## Using Tokens

Another way to create users is by giving them JWT tokens for authentication. A common use of this form of authentication is for external services or temporary users, since it's easier to remove a token than a certificate.

This is because we create tokens using ServiceAccounts, the same way we create them for non-human services. Each SA will create a new Secret with a JWT token that's valid even outside the cluster.

The creation is quite simple:

```bash
kubectl create serviceaccount lucas-sa
```

Now, let's get the SA and see the name of the Secret it created using `kubectl get sa lucas-sa -o yaml`. Notice we have a key called `secrets`. This key will be an array of objects whose `name` property is the name of the secret we're looking for. In my case it was like this:

```bash
secrets:
  - name: lucas-sa-token-6dfl4
```

Now let's get the token with this simple command:

```bash
TOKEN=$(kubectl get secret lucas-sa-token-6dfl4 -o jsonpath='{.data.token}')
```

To create a new user in `kubectl` with a token, we can use the following command line:

```bash
kubectl config set-credentials lucas-token \
  --token=$TOKEN && \
kubectl config set-context lucas-token-context \
  --cluster=nome-do-cluster \
  --user=lucas-sa
```

## Conclusion

We've seen how we can create users in Kubernetes through digital certificates and tokens. In future articles, we'll explore how to complete the picture by giving them different permission levels with roles. Be sure to follow [the continuation of this series](/dando-permissoes-a-usuarios-com-kubernetes/).

With this, your cluster's security will increase greatly and you'll become able to understand and manage users so that no one can do anything other than what you're allowing. Improving the audit trail in the process.

See you!

[^n1]: To know the correct names, read your `kubeconfig` file to find these keys.
