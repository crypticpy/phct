---
layout: default
title: "Resources"
summary: "Curated guides, toolkits and links."
permalink: /resources/
---
{%- comment -%} Maintainers: the groups and items on this page come from
_data/resources.yml; the optional banner is site.yml `resources.image`. {%- endcomment -%}
<section class="mb-10 max-w-3xl">
  <span class="eyebrow">Library</span>
  <h1 class="page-title mt-2">Resources</h1>
  <p class="mt-4 text-lg text-brand-muted">Guides, toolkits and reference links, curated and reviewed by the maintainers.</p>
</section>
{%- assign rs_art = site.data.site.resources.image | default: '' -%}
{%- if rs_art != '' -%}
<div class="page-art mb-10" aria-hidden="true">{% include picture.html src=rs_art alt='' sizes="(min-width: 1280px) 1216px, 95vw" class="page-art-img" eager=true %}</div>
{%- endif -%}
{% if site.data.resources and site.data.resources.size > 0 %}
<div class="grid gap-8 lg:grid-cols-2">
  {% for group in site.data.resources %}
    <section class="card min-w-0" aria-labelledby="group-{{ forloop.index }}">
      <div class="card-header"><h2 id="group-{{ forloop.index }}" class="card-title">{{ group.group }}</h2>{% if group.description %}<p class="text-sm text-brand-muted">{{ group.description }}</p>{% endif %}</div>
      <ul class="space-y-3 px-6 py-6">
        {% for item in group.items %}
          {% include resource-item.html item=item %}
        {% endfor %}
      </ul>
    </section>
  {% endfor %}
</div>
{% else %}
{% include empty-state.html icon='document' title='No resources yet' body='Add groups and items to _data/resources.yml to populate this page.' %}
{% endif %}
