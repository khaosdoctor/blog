---
title: Granting permissions to users with Kubernetes
pubDate: 2021-02-23T12:00:00.000Z
updatedDate: 2026-07-16T16:18:12.000Z
category: technology
tags: ["kubernetes", "aks", "azure", "devops", "infrastructure", "security"]
lang: en
description: We know how to create users in Kubernetes, now let's learn how to grant them permissions using Roles and ClusterRoles!
seoDescription: We know how to create users in Kubernetes, let's learn how to grant them permissions using Roles and ClusterRoles!
slug: giving-permissions-to-users-with-kubernetes
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

In the [previous article](/criando-e-gerenciando-usuarios-no-kubernetes/), we discussed how to create users in Kubernetes so we don't have the problem of everyone having the same level of access across all namespaces. However, we didn't elaborate on how we can actually grant those permissions.

Let's understand more about how RBAC (Role Based Access Control) works and how we can take advantage of it to use our cluster more securely.

## RBAC

Kubernetes supports several authorization methods, the most famous by far is RBAC which stands for **Role Based Access Control**. Basically, RBAC limits access to cluster resources through four Kubernetes _resources_: **Roles**, **RoleBindings**, **ClusterRoles**, and **ClusterRoleBindings**.

Having role-based access instead of profile-based access lets you share these Roles with multiple users, distributing permissions across the cluster so everyone has the correct access when they need it. A basic use case for this model is allowing, for example, coordinators and area managers to access their own namespaces to manage their own teams, thus avoiding escalating issues to the cluster operations team.

To create these access policies, we'll use a very special API group in Kubernetes, `rbac.authorization.k8s.io`. This means you can create and configure these access policies dynamically through the Kubernetes API and `kubectl`.

Most clusters come with RBAC enabled by default, but it's possible to start a new `kube-apiserver` with the `--authorization-mode=RBAC` flag for manual clusters, and in Azure, you can enable RBAC in an AKS cluster directly from the portal:

![](./image.png)

### Terminology

In RBAC, users are called _**subjects**_, the APIs and resources that users may or may not have access to are called **_resources_**. We also have _**verbs**_, which are the actions and operations that can be executed on a **_resource_** by a **_subject_**.[^n1]

## Roles and ClusterRoles

The foundation of all RBAC access policies is a native object called **Role**. **Roles** are the rules that define access to a **resource**, meaning they are not the rules _applied_ to a **subject** but rather a set of rules that can be reused for multiple users.

In addition to Roles, there are **ClusterRoles** which, like Roles, are access rules for one or more **resources**, but while the Role object is limited to its own namespace, the ClusterRole applies to the entire cluster regardless of which namespace it's in. This allows you to define global policies that apply to the entire cluster and to define policies for Kubernetes resources that don't depend on namespaces, like Nodes.

There are some important rules to know before we get started:

- There are no rules to "deny" user access to a resource. As we mentioned before, like Ingresses, Kubernetes works on a `deny-all` model, meaning all permissions are denied by default and everything you create will be an exception to the deny list.
- Roles **always** depend on a namespace, so when you create a new Role, you need to set which namespace it belongs to.
- Conversely, ClusterRoles don't need a namespace because they're above that separation.

## Defining our permissions

In the [previous article](/criando-e-gerenciando-usuarios-no-kubernetes/) we created a user named Lucas who is part of the development team. Let's imagine we also created other users in the system to complete our team:

- Ana, who is the development area coordinator (leader of the `devs` group, which Lucas is part of)
- Thiago, who is the BI area manager (leader of the `bi` group)
- Fernanda, who is a BI analyst (part of the `bi` group)
- Amanda, who is one of the DevOps area coordinators and one of the cluster operators responsible for maintaining several development projects (part of the `devs` and `devops` groups)

For our scenario, let's imagine Lucas works on one of many projects in the company's cluster. To allow the work to be done, he needs access to his namespace. And because the company has a more mature DevOps culture, all developers are responsible for deploying their applications, so he needs full access to creating resources.

Ana, being the development leader, needs full access to all development area projects.

Thiago, likewise, needs full read access to all objects in the cluster, but Fernanda is working on the same project as Lucas, so she can only have read access in this namespace.

Amanda is the cluster coordinator, so she needs full access to all objects in the cluster to be able to perform actions on them.

### Creating Roles

Now that we have our scenarios defined, let's move on to creating our permissions. We'll create a base object called `developer` that will apply to every developer in the `projeto1` namespace, which is the project for Lucas and Fernanda's team:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer
  namespace: projeto1
```

So far we're defining that this Role will be within the project's namespace, so all permissions will be restricted to this namespace. Now let's define the rules:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer
  namespace: projeto1
rules:
- apiGroups: ["", "autoscaling", "apps", "networking.k8s.io"]
  verbs: ["get", "list", "create", "watch", "update"]
  resources: ["*"]
```

What we're doing here is creating a Role that will grant access to all resources present in the following APIs:

- `""`: Means the Kubernetes `core` API, that is, when we don't use any FQDN before the `/` when creating a new workload. For example, Pods are part of this API; when we create a new Pod we use `apiVersion: v1`.
- `autoscaling`: The group that controls application scalability; `HorizontalPodAutoscalers` are part of this group
- `apps`: The group for `Deployments`, `DaemonSets`, and others
- `networking.k8s.io`: The group for `Ingresses`

> You can find all API groups [in the official documentation](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.20/#-strong-api-groups-strong-) and also using the `kubectl api-resources -o wide` command, which will show not only the groups but also the available names and verbs.

In addition, we're granting access to almost all verbs except `delete` for all _resources_ described by these APIs through the `*` wildcard.

For the read-only Role, we'll make a copy of this Role and call it `developer-readonly`:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer-readonly
  namespace: projeto1
rules:
- apiGroups: ["*"]
  verbs: ["get", "list"]
  resources: ["*"]
```

For the development area management Role, we need to create a permission that allows full access to all resources and verbs within the namespaces specific to the development area. Let's assume this area has only two projects called `projeto1` and `projeto2`. In this case we need to create two identical Roles, one for each namespace, and we'll name them `developer-admin`:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer-admin
  namespace: projeto1
rules:
- apiGroups: ["*"]
  verbs: ["*"]
  resources: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer-admin
  namespace: projeto2
rules:
- apiGroups: ["*"]
  verbs: ["*"]
  resources: ["*"]
```

> We can also create Roles interactively with `kubectl create role <name> -n <namespace> --verb=verb1,verb2,verb3 --resource=resource1,resource2`

### Creating ClusterRoles

For the Role that will be applied to Thiago, we need to allow him to read and list any resource in any namespace of the cluster. This would be complicated if we were creating a common Role, so we'll create a ClusterRole so it can be applied automatically. This ClusterRole will be called `readonly`:[^n2]

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: readonly
rules:
- apiGroups: ["*"]
  verbs: ["get", "list", "watch"]
  resources: ["*"]
```

For the last permission, we'll create the object that will be given to Amanda. Since she's the cluster operator, she needs full access to all resources in all cluster namespaces. We'll call this ClusterRole `cluster-operator`:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-operator
rules:
- apiGroups: ["*"]
  verbs: ["*"]
  resources: ["*"]
```

> Similarly to Roles, we can create ClusterRoles with `kubectl` using the command `kubectl create clusterrole <name> --verb=verb1,verb2 --resource=resource1,resource2`

## Applying permissions with bindings

As we mentioned before, Roles and ClusterRoles are just permission definitions. These definitions need to be applied to users through other "sibling" objects called **RoleBindings** and **ClusterRoleBindings**.

Bindings grant the permissions defined in Roles and ClusterRoles to **_subjects_** and **groups**. In our case, we have some groups but also some individual users we want to grant access. We can also grant access to a ServiceAccount.

The differences between the two are basically the same as between Role and ClusterRole. While a RoleBinding can be applied to a Role or a ClusterRole (although when done that way, **it will apply the ClusterRole's rules only to the namespace to which that RoleBinding belongs**), a ClusterRoleBinding can only be applied to a ClusterRole.

All bindings need a reference to an existing Role or ClusterRole. RoleBindings can only reference Roles within the same namespace, while ClusterRoleBindings can reference any ClusterRoles.

For our first binding, let's look at the Lucas user, who will have the `developer` Role associated with him:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developer
  namespace: projeto1
subjects:
  - kind: Group
    name: devs
    apiGroup: rbac.authorization.k8s.io
roleRef:
  - kind: Role
    name: developer
    apiGroup: rbac.authorization.k8s.io
```

What we're doing here is creating a RoleBinding that will be applied to all `subjects` in the `subjects` array. In this case, a subject can have several `kinds`, such as `User`, `Group`, and `ServiceAccount`.

Additionally, in the `roleRef` key, we have the name of the Role we'll apply to these subjects. Here we have two possible `kind` values: `Role` or `ClusterRole`. And we're essentially saying we want the Role called `developer` to be applied to the subject whose `kind` is a `Group`, that is, a group of users called `devs`.

Now, for Fernanda's binding, we'll do the same thing, but change the name of the `roleRef`:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: business-intelligence
  namespace: projeto1
subjects:
  - kind: Group
    name: bi
    apiGroup: rbac.authorization.k8s.io
roleRef:
  - kind: Role
    name: readonly
    apiGroup: rbac.authorization.k8s.io
```

Now let's create the binding for Ana. Just as we created two different roles, we'll create two more bindings to ensure we grant her access directly:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developer-admin
  namespace: projeto1
subjects:
  - kind: User
    name: ana
    apiGroup: rbac.authorization.k8s.io
roleRef:
  - kind: Role
    name: developer-admin
    apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developer-admin
  namespace: projeto2
subjects:
  - kind: User
    name: ana
    apiGroup: rbac.authorization.k8s.io
roleRef:
  - kind: Role
    name: developer-admin
    apiGroup: rbac.authorization.k8s.io
```

Now we need to create the last two bindings, which are ClusterRoleBindings, because we'll be granting access to the entire cluster. In Thiago's case, we need to be careful because we can't apply the ClusterRole to the `bi` group since Fernanda is also part of that group, so we'll apply it only to the user:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: readonly
subjects:
  - kind: User
    name: thiago
    apiGroup: rbac.authorization.k8s.io
roleRef:
  - kind: ClusterRole
    name: readonly
    apiGroup: rbac.authorization.k8s.io
```

And similarly, we'll create Amanda's binding:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cluster-operator
subjects:
  - kind: User
    name: amanda
    apiGroup: rbac.authorization.k8s.io
roleRef:
  - kind: ClusterRole
    name: cluster-operator
    apiGroup: rbac.authorization.k8s.io
```

> We can also create RoleBindings and ClusterRoleBindings interactively with `kubectl create rolebinding <name> --[user|group|serviceaccount] <subject> --[role|clusterrole] <roleRef>`

Now with the bindings created, we can execute commands as each user and each of them will have the permissions needed for their teams.

## Conclusion

Now we know how to create users and how to assign permissions to them. In the next articles, we'll see how we can further improve the authentication model using Azure Managed AD with AKS!

See you there!

[^n1]: Verbs are basically the calls that can be made by a user to a given resource. For example, creating a Pod is a `create` **verb** on a `Pod` **resource** made by the user.

[^n2]: Note that ClusterRoles don't have a `namespace` key.
