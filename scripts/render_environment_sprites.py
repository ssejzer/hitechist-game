"""Render the career workplaces' reusable isometric PNG sprites with Blender 4.

Run: blender --background --python scripts/render_environment_sprites.py
The generated files are checked in so the game never needs Blender at runtime.
"""

from pathlib import Path
import math
import bpy
from mathutils import Vector


OUTPUT = Path(__file__).resolve().parents[1] / "public/assets/isometric"
OUTPUT.mkdir(parents=True, exist_ok=True)


def material(name, color, roughness=0.8):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = roughness
    return mat


wood = material("honey wood", (0.56, 0.32, 0.17))
wood_edge = material("wood edge", (0.35, 0.20, 0.12))
cream = material("warm cream", (0.76, 0.76, 0.67))
cream_edge = material("cream shadow", (0.54, 0.56, 0.51))
dark = material("charcoal", (0.08, 0.14, 0.16))
screen = material("screen glass", (0.08, 0.30, 0.34), 0.28)
screen_light = material("screen glow", (0.38, 0.77, 0.68), 0.4)
metal = material("dark steel", (0.24, 0.29, 0.30), 0.55)
seat = material("chair upholstery", (0.20, 0.33, 0.32))
green = material("leaf green", (0.19, 0.43, 0.29))
green_light = material("leaf highlight", (0.36, 0.56, 0.35))
terra = material("terracotta", (0.58, 0.34, 0.25))
coffee = material("coffee light", (0.65, 0.36, 0.23))
status = material("indicator", (0.56, 0.92, 0.57))
blue = material("network blue", (0.23, 0.42, 0.49))
violet = material("storage violet", (0.39, 0.34, 0.47))
silver = material("rack silver", (0.40, 0.47, 0.48))


def cube(name, location, scale, mat, bevel=0.025):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new("soft edges", "BEVEL")
        mod.width = bevel
        mod.segments = 1
    return obj


def cylinder(name, location, radius, depth, mat, vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    bevel = obj.modifiers.new("soft edges", "BEVEL")
    bevel.width = 0.018
    bevel.segments = 1
    return obj


def cone(name, location, radius1, radius2, depth, mat, vertices=7):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius1, radius2=radius2, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return obj


def workstation():
    cube("desk top", (0, 0, 0.75), (1.58, 0.82, 0.09), wood, 0.035)
    cube("front apron", (0, 0.35, 0.65), (1.42, 0.06, 0.13), wood_edge)
    for x in (-0.66, 0.66):
        for y in (-0.30, 0.30):
            cube("desk leg", (x, y, 0.36), (0.07, 0.07, 0.72), wood_edge)
    cube("monitor foot", (-0.23, -0.18, 0.83), (0.31, 0.20, 0.035), metal)
    cube("monitor neck", (-0.23, -0.18, 1.01), (0.06, 0.06, 0.35), metal)
    cube("monitor bezel", (-0.23, -0.20, 1.20), (0.57, 0.07, 0.39), dark)
    cube("monitor display", (-0.23, -0.16, 1.20), (0.49, 0.015, 0.31), screen, 0.005)
    for z, width in ((1.27, 0.28), (1.18, 0.35), (1.10, 0.20)):
        cube("display line", (-0.29, -0.151, z), (width, 0.009, 0.018), screen_light, 0)
    cube("keyboard", (-0.15, 0.17, 0.82), (0.51, 0.19, 0.025), cream_edge, 0.008)
    cube("mouse", (0.29, 0.17, 0.83), (0.08, 0.12, 0.035), dark)
    # Swivel chair remains inside the desk's existing collision tile.
    cylinder("chair pedestal", (0.37, 0.65, 0.18), 0.045, 0.34, metal)
    cylinder("chair base", (0.37, 0.65, 0.035), 0.25, 0.04, metal, 8)
    cube("chair cushion", (0.37, 0.65, 0.49), (0.43, 0.43, 0.10), seat, 0.05)
    cube("chair back", (0.37, 0.90, 0.76), (0.46, 0.10, 0.53), seat, 0.07)


def equipment():
    cube("cabinet", (0, 0, 0.43), (0.72, 0.62, 0.83), cream, 0.06)
    cube("cabinet side", (0.30, 0, 0.43), (0.11, 0.52, 0.72), cream_edge)
    cube("screen bezel", (0, 0.32, 0.57), (0.59, 0.055, 0.39), dark, 0.018)
    cube("screen", (0, 0.351, 0.58), (0.50, 0.008, 0.29), screen, 0)
    for z, width in ((0.65, 0.31), (0.57, 0.37), (0.49, 0.20)):
        cube("screen data", (-0.07, 0.36, z), (width, 0.005, 0.019), screen_light, 0)
    for x in (-0.20, -0.08, 0.04):
        cylinder("status lamp", (x, 0.344, 0.27), 0.022, 0.015, status, 8)
    cube("lower vent", (0, 0.34, 0.13), (0.36, 0.012, 0.035), cream_edge, 0)


def network_station():
    cube("router cabinet", (0, 0, 0.47), (0.70, 0.60, 0.92), blue, 0.05)
    cube("front panel", (0, 0.31, 0.54), (0.56, 0.025, 0.60), dark, 0.02)
    for z in (0.75, 0.62, 0.49):
        cube("network slot", (-0.07, 0.33, z), (0.35, 0.012, 0.055), metal, 0.005)
        cube("network light", (0.19, 0.34, z), (0.035, 0.012, 0.028), status, 0)
    cube("base vent", (0, 0.33, 0.23), (0.39, 0.01, 0.06), silver, 0)


def storage_station():
    cube("storage cabinet", (0, 0, 0.47), (0.80, 0.65, 0.91), violet, 0.05)
    cube("storage door", (0, 0.335, 0.52), (0.64, 0.025, 0.63), dark, 0.02)
    for z in (0.67, 0.52, 0.37):
        cube("drive tray", (-0.04, 0.36, z), (0.44, 0.015, 0.10), silver, 0.005)
        cube("drive handle", (0.21, 0.38, z), (0.055, 0.01, 0.025), status, 0)


def rack(kind):
    trim = {"compute": blue, "storage": violet, "network": green}[kind]
    cube("server chassis", (0, 0, 0.72), (0.78, 0.63, 1.42), dark, 0.035)
    cube("front frame", (0, 0.33, 0.72), (0.69, 0.055, 1.32), silver, 0.025)
    cube("front well", (0, 0.365, 0.72), (0.58, 0.012, 1.20), dark, 0.005)
    cube("top trim", (0, 0, 1.41), (0.78, 0.66, 0.08), trim)
    for row in range(6):
        z = 0.24 + row * 0.19
        cube("rack unit", (-0.04, 0.38, z), (0.46, 0.012, 0.13), metal, 0.01)
        cube("rack slot", (-0.13, 0.393, z), (0.22, 0.006, 0.025), cream_edge, 0)
        cube("rack lamp", (0.23, 0.395, z), (0.035, 0.006, 0.035), status, 0)
    cube("side ventilation", (0.397, 0, 0.73), (0.008, 0.40, 0.95), trim, 0)


def utility():
    cube("service console", (0, 0, 0.46), (0.65, 0.54, 0.90), metal, 0.045)
    cube("display frame", (0, 0.28, 0.64), (0.53, 0.026, 0.37), dark, 0.012)
    cube("display", (0, 0.30, 0.64), (0.44, 0.01, 0.27), screen, 0)
    for z in (0.72, 0.64, 0.56):
        cube("data trace", (-0.08, 0.31, z), (0.25, 0.006, 0.018), screen_light, 0)
    cube("control shelf", (0, 0.33, 0.35), (0.48, 0.14, 0.055), dark)


def meeting_table():
    cube("conference top", (0, 0, 0.69), (1.65, 0.94, 0.10), wood, 0.045)
    cube("conference pedestal", (0, 0, 0.35), (0.55, 0.38, 0.67), wood_edge)
    for x in (-0.56, 0.56):
        cube("tablet", (x, 0.03, 0.76), (0.32, 0.22, 0.025), dark, 0.008)
        cube("tablet screen", (x, 0.03, 0.778), (0.26, 0.16, 0.006), screen, 0)
    for x in (-0.49, 0.49):
        cube("conference chair seat", (x, 0.71, 0.43), (0.37, 0.34, 0.08), seat, 0.035)
        cube("conference chair back", (x, 0.93, 0.69), (0.39, 0.07, 0.48), seat, 0.05)
        cylinder("chair stand", (x, 0.71, 0.21), 0.035, 0.40, metal, 8)


def coffee_machine():
    cube("machine", (0, 0, 0.47), (0.63, 0.55, 0.92), metal, 0.055)
    cube("top shell", (0, 0, 0.91), (0.65, 0.59, 0.10), dark)
    cube("front recess", (0, 0.29, 0.61), (0.47, 0.025, 0.42), dark)
    cube("coffee display", (0, 0.312, 0.75), (0.35, 0.008, 0.09), coffee, 0)
    cube("drip tray", (0, 0.36, 0.27), (0.46, 0.18, 0.045), dark)
    cylinder("mug", (0, 0.34, 0.36), 0.11, 0.16, cream, 12)
    cube("button", (-0.21, 0.32, 0.49), (0.04, 0.02, 0.04), status, 0)


def plant():
    cone("pot", (0, 0, 0.16), 0.22, 0.17, 0.32, terra, 10)
    cylinder("rim", (0, 0, 0.30), 0.23, 0.055, terra, 10)
    cylinder("trunk", (0, 0, 0.49), 0.045, 0.40, wood_edge, 7)
    for index, (x, y, z, radius) in enumerate((
        (-0.18, 0.02, 0.65, 0.21), (0.19, 0.03, 0.68, 0.22),
        (0, -0.18, 0.78, 0.24), (0, 0.19, 0.78, 0.22), (0, 0, 0.96, 0.22),
    )):
        cone("leaf cluster", (x, y, z), radius, 0.025, radius * 1.9,
             green_light if index % 2 else green, 6)


def clear_meshes():
    for obj in list(bpy.data.objects):
        if obj.type == "MESH":
            bpy.data.objects.remove(obj, do_unlink=True)


scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 24
scene.cycles.use_denoising = False
scene.render.resolution_x = 320
scene.render.resolution_y = 352
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.view_settings.view_transform = "Standard"
scene.view_settings.look = "Medium High Contrast"

bpy.ops.object.camera_add(location=(5, 5, 6))
camera = bpy.context.object
camera.rotation_euler = (Vector((0, 0, 0.56)) - camera.location).to_track_quat("-Z", "Y").to_euler()
camera.data.type = "ORTHO"
camera.data.ortho_scale = 3.15
scene.camera = camera

bpy.ops.object.light_add(type="AREA", location=(-3, 4, 7))
key = bpy.context.object
key.data.energy = 700
key.data.shape = "DISK"
key.data.size = 4

scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.45, 0.50, 0.52, 1)
scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.35

for name, maker in (
    ("office-desk", workstation), ("meeting-table", meeting_table),
    ("office-equipment", equipment), ("network-station", network_station),
    ("storage-station", storage_station), ("rack-compute", lambda: rack("compute")),
    ("rack-storage", lambda: rack("storage")), ("rack-network", lambda: rack("network")),
    ("utility-console", utility), ("coffee-machine", coffee_machine),
    ("office-plant", plant),
):
    clear_meshes()
    maker()
    scene.render.filepath = str(OUTPUT / f"{name}.png")
    bpy.ops.render.render(write_still=True)
    print(f"Rendered {scene.render.filepath}")
