"""
war3_build_order_visualizer.py
----------------------------------------------------------
Visualizes Warcraft III build order CSVs as interactive timelines.

- Opens the latest parsed CSV, or lets users add more .w3g or .csv files.
- Uses pygame for a modern, multi-replay build order/hero view.
- All paths are now relative—just unzip and run from anywhere!

Requirements:
    pip install pygame
    (other requirements as needed)
----------------------------------------------------------
"""

import pygame      # Yes, required for UI/graphics (keep)
import csv         # Yes, for reading CSV build order files (keep)
import os          # Yes, for paths and portability (keep)
import sys         # Yes, for sys.exit and script args (keep)
import glob        # Yes, for finding files with wildcards (keep)
import subprocess  # Yes, to run Node.js parser if user loads a .w3g (keep)
from tkinter import filedialog, Tk  # Yes, for file picker dialog (keep)

# Always operate relative to the script location!
script_dir = os.path.dirname(os.path.abspath(__file__))

default_icon_path = os.path.join(script_dir, "Icons", "Default.webp")
icon_csv_path = os.path.join(script_dir, "icon_map.csv")
parsed_csv_folder = os.path.join(script_dir, "parsed_replays")
node_parser_script = os.path.join(script_dir, "w3replayvision_export.js")

def load_unit_icons(icon_csv_path, default_icon_path):
    icon_map = {}
    try:
        with open(icon_csv_path, newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                if 'Name' in row and 'Path' in row and row['Name'].strip():
                    icon_map[row['Name'].strip()] = row['Path'].strip()
    except Exception as e:
        print(f"Could not load icon csv: {e}")
    return icon_map

unit_icons = load_unit_icons(icon_csv_path, default_icon_path)

PLAYER_COLORS = [
    (240,170,30),   # Orange
    (40,180,255),   # Blue
    (220,60,60),    # Red
    (60,250,100),   # Green
    (220,100,230),  # Purple
    (255,120,120),  # Pink
    (100,255,255),  # Teal
    (190,255,120),  # Light Green
    (255,255,120),  # Yellow
    (190,190,255),  # Light Blue
    (255,200,200),  # Peach
    (200,140,255),  # Lavender
]

BG = (22, 22, 22)
ICON_BG = (245, 245, 245)
ICON_OUTLINE = (170, 170, 170)
HIGHLIGHT = (255, 235, 60)
BAR = (180,180,180)
BAR_BG = (50,50,50)

def parse_time_string(time_str):
    try:
        parts = time_str.strip().split(':')
        if len(parts) == 2:
            minutes = int(parts[0])
            seconds = int(parts[1])
            return minutes * 60 + seconds
        elif len(parts) == 3:
            hours = int(parts[0])
            minutes = int(parts[1])
            seconds = int(parts[2])
            return hours * 3600 + minutes * 60 + seconds
        else:
            return int(parts[0])
    except Exception:
        return 0

def format_time(total_seconds):
    m = int(total_seconds) // 60
    s = int(total_seconds) % 60
    return f"{m:02}:{s:02}"

def run_node_parser(w3g_path):
    try:
        subprocess.run(["node", node_parser_script, w3g_path], check=True)
    except Exception as e:
        print("Error running Node parser:", e)
        return None
    # Find the most recent CSV in the folder
    csv_files = glob.glob(os.path.join(parsed_csv_folder, "*.csv"))
    if not csv_files:
        print("Parser didn't produce any CSV!")
        return None
    latest_csv = max(csv_files, key=os.path.getmtime)
    print(f"Parsed CSV: {latest_csv}")
    return latest_csv

def load_replay_csv(csv_path, replay_tag, color_offset):
    unit_creation_data = []
    max_time_sec = 0
    player_color_map = {}
    with open(csv_path, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        players = set()
        for row in reader:
            pname = row['Player']
            tname = f"[{replay_tag}]{pname}"
            players.add(tname)
            time_sec = parse_time_string(row['Time'])
            unit_creation_data.append({
                'player': tname,
                'orig_player': pname,
                'replay': replay_tag,
                'time': row['Time'],
                'time_sec': time_sec,
                'category': row['Category'],
                'name': row['Name']
            })
            if time_sec > max_time_sec:
                max_time_sec = time_sec
        players = sorted(list(players))
        for idx, pname in enumerate(players):
            player_color_map[pname] = PLAYER_COLORS[(color_offset+idx)%len(PLAYER_COLORS)]
    return unit_creation_data, player_color_map, max_time_sec

def add_replay(unit_creation_data_all, player_color_map_all, player_enabled, replays_loaded):
    Tk().withdraw()
    fname = filedialog.askopenfilename(
        title="Select Warcraft III Replay (.w3g or .csv)",
        filetypes=[("Warcraft III Replays/CSVs", "*.w3g;*.csv")])
    if not fname:
        return
    replay_idx = len(replays_loaded) + 1
    replay_tag = f"R{replay_idx}"
    if fname.lower().endswith(".w3g"):
        print("Parsing .w3g replay, please wait...")
        parsed_csv = run_node_parser(fname)
        if not parsed_csv:
            print("Failed to parse replay.")
            return
        fname = parsed_csv
    color_offset = 6*(replay_idx-1)
    data, color_map, max_time = load_replay_csv(fname, replay_tag, color_offset)
    unit_creation_data_all.extend(data)
    player_color_map_all.update(color_map)
    for pname in color_map:
        if pname not in player_enabled:
            player_enabled[pname] = True
    replays_loaded.append((fname, replay_tag, color_offset))
    print(f"Added replay {fname} as {replay_tag} ({len(color_map)} player(s)), {max_time}s.")
    return max_time

def create_pygame_with_multi_replay():
    pygame.init()
    min_width, min_height = 1450, 900
    screen = pygame.display.set_mode((min_width, min_height), pygame.RESIZABLE)
    pygame.display.set_caption("Warcraft III Replay Visualization - Multi-Replay Compare")

    img_cache = {}
    unit_creation_data_all = []
    player_color_map_all = {}
    player_enabled = {}
    replays_loaded = []
    max_time_sec = 0

    # --- Start with initial replay ---
    csv_files = glob.glob(os.path.join(parsed_csv_folder, "*.csv"))
    if not csv_files:
        print(f"No CSVs found in {parsed_csv_folder}")
        sys.exit(1)
    latest_csv = max(csv_files, key=os.path.getmtime)
    base_data, base_color_map, base_max_time = load_replay_csv(latest_csv, "R1", 0)
    unit_creation_data_all.extend(base_data)
    player_color_map_all.update(base_color_map)
    for pname in base_color_map:
        player_enabled[pname] = True
    replays_loaded.append((latest_csv, "R1", 0))
    max_time_sec = base_max_time

    playhead_time = 0
    dragging_slider = False
    running = True
    clock = pygame.time.Clock()
    is_playing = False
    play_speed = 1.0
    timeline_zoom = 1.0  # 1.0 = default, higher = zoom in, lower = zoom out
    timeline_zoom_min = 0.25
    timeline_zoom_max = 8.0
    timeline_view_center = None  # Always keep playhead centered

    scroll_offset = 0
    max_scroll = 0
    dragging_scrollbar = False  # For scrollbar drag tracking

    dropdown_open = False
    dropdown_rect = None
    dropdown_scroll_offset = 0
    dropdown_scroll_max = 0
    dragging_dropdown_scrollbar = False
    dropdown_thumb_rect = None
    dropdown_scrollbar_rect = None

    def get_fonts(scale):
        return (
            pygame.font.SysFont("Segoe UI", int(22 * scale)),
            pygame.font.SysFont("Segoe UI", int(64 * scale), bold=True),  # big clock
            pygame.font.SysFont("Segoe UI", int(19 * scale)),
            pygame.font.SysFont("Segoe UI", int(28 * scale), bold=True)
        )

    checkbox_rects = []
    dropdown_checkbox_rects = []

    while running:
        width, height = screen.get_size()
        scale = max(1, min(width / 1450, height / 900, 1.5))
        font, bigclock, smallfont, playerfont = get_fonts(scale)
        pad = int(30 * scale)
        icon_size = int(46 * scale)
        icon_pad = int(9 * scale)
        icon_box_size = icon_size + 10
        timeline_icon_size = int(38 * scale)
        timeline_area_height = timeline_icon_size + int(18*scale)
        next_icon_size = int(52 * scale)
        next_icon_pad = int(7 * scale)
        player_gap = int(20*scale)

        # Collect active player list (checkboxes order)
        players = sorted(player_enabled)
        visible_players = [p for p in players if player_enabled[p]]

        screen.fill(BG)

        # --- EVENTS ---
        dt = clock.tick(60) / 1000
        mx, my = pygame.mouse.get_pos()
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.VIDEORESIZE:
                screen = pygame.display.set_mode((event.w, event.h), pygame.RESIZABLE)
            elif event.type == pygame.MOUSEBUTTONDOWN:
                # "Add Replay" button
                if add_rect.collidepoint(mx, my):
                    new_max = add_replay(unit_creation_data_all, player_color_map_all, player_enabled, replays_loaded)
                    if new_max:
                        max_time_sec = max(max_time_sec, new_max)
                        playhead_time = min(playhead_time, max_time_sec)

                # Dropdown button (top right)
                if dropdown_button_rect.collidepoint(mx, my):
                    dropdown_open = not dropdown_open
                    dropdown_scroll_offset = 0
                    dragging_dropdown_scrollbar = False

                # Dropdown scroll bar drag start
                if dropdown_open and dropdown_scrollbar_rect and dropdown_scrollbar_rect.collidepoint(mx, my):
                    dragging_dropdown_scrollbar = True
                    scrollbar_drag_offset_y = my - dropdown_thumb_rect.y

                # Dropdown checkbox clicks
                if dropdown_open:
                    for rect, pname in dropdown_checkbox_rects:
                        if rect.collidepoint(mx, my):
                            player_enabled[pname] = not player_enabled[pname]
                            break

                # Player checkboxes (horizontal - disabled now)
                # for rect, pname in checkbox_rects:
                #     if rect.collidepoint(mx, my):
                #         player_enabled[pname] = not player_enabled[pname]
                #         break

                # Slider
                if slider_track_rect.collidepoint(mx, my) or thumb_rect.collidepoint(mx, my):
                    dragging_slider = True
                # Scrollbar drag start for build list
                if scrollbar_rect.collidepoint(mx, my):
                    dragging_scrollbar = True
                    scrollbar_drag_offset_y = my - scrollbar_thumb_rect.y

                # Play button
                if play_rect.collidepoint(mx, my):
                    is_playing = not is_playing

            elif event.type == pygame.MOUSEBUTTONUP:
                dragging_slider = False
                dragging_scrollbar = False
                dragging_dropdown_scrollbar = False

            elif event.type == pygame.MOUSEMOTION:
                if dragging_slider:
                    mx_ = event.pos[0]
                    slider_percent = min(1, max(0, (mx_ - slider_track_rect.x) / slider_track_rect.width))
                    playhead_time = int(slider_percent * max_time_sec)
                    is_playing = False
                if dragging_scrollbar:
                    new_thumb_y = event.pos[1] - scrollbar_drag_offset_y
                    new_thumb_y = max(scrollbar_rect.y, min(scrollbar_rect.bottom - scrollbar_thumb_rect.height, new_thumb_y))
                    scrollbar_thumb_rect.y = new_thumb_y
                    scroll_ratio = (scrollbar_thumb_rect.y - scrollbar_rect.y) / (scrollbar_rect.height - scrollbar_thumb_rect.height)
                    scroll_offset = -int(scroll_ratio * max_scroll)
                if dragging_dropdown_scrollbar:
                    new_thumb_y = event.pos[1] - scrollbar_drag_offset_y
                    new_thumb_y = max(dropdown_scrollbar_rect.y, min(dropdown_scrollbar_rect.bottom - dropdown_thumb_rect.height, new_thumb_y))
                    dropdown_thumb_rect.y = new_thumb_y
                    scroll_ratio = (dropdown_thumb_rect.y - dropdown_scrollbar_rect.y) / (dropdown_scrollbar_rect.height - dropdown_thumb_rect.height)
                    dropdown_scroll_offset = -int(scroll_ratio * dropdown_scroll_max)

            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_LEFT:
                    playhead_time = max(0, playhead_time - 5)
                    is_playing = False
                elif event.key == pygame.K_RIGHT:
                    playhead_time = min(max_time_sec, playhead_time + 5)
                    is_playing = False
                elif event.key == pygame.K_SPACE:
                    is_playing = not is_playing
                elif event.key in (pygame.K_PLUS, pygame.K_EQUALS):
                    timeline_zoom = min(timeline_zoom_max, timeline_zoom * 2)
                    timeline_view_center = None
                elif event.key in (pygame.K_MINUS, pygame.K_UNDERSCORE):
                    timeline_zoom = max(timeline_zoom_min, timeline_zoom / 2)
                    timeline_view_center = None
                elif event.key == pygame.K_DOWN:
                    scroll_offset -= 40
                elif event.key == pygame.K_UP:
                    scroll_offset += 40

            elif event.type == pygame.MOUSEWHEEL:
                if slider_track_rect.collidepoint(mx, my):
                    if event.y > 0:
                        timeline_zoom = min(timeline_zoom_max, timeline_zoom * 1.25)
                    else:
                        timeline_zoom = max(timeline_zoom_min, timeline_zoom / 1.25)
                    timeline_view_center = None
                else:
                    scroll_offset += event.y * 40
                    if dropdown_open and dropdown_scrollbar_rect and dropdown_scrollbar_rect.collidepoint(mx, my):
                        dropdown_scroll_offset += event.y * 40

        # Clamp scroll offsets
        scroll_offset = max(-max_scroll, min(0, scroll_offset))
        dropdown_scroll_offset = max(-dropdown_scroll_max, min(0, dropdown_scroll_offset))

        # --- Playhead animation ---
        if is_playing:
            playhead_time += play_speed * dt
            if playhead_time > max_time_sec:
                playhead_time = max_time_sec
                is_playing = False
        playhead_time = max(0, min(playhead_time, max_time_sec))

        # --- "Add Replay" Button ---
        add_rect = pygame.Rect(pad, pad, 170*scale, 48*scale)
        shadow_rect = add_rect.move(2*scale, 3*scale)
        pygame.draw.rect(screen, (40, 60, 130), shadow_rect, border_radius=16)  # shadow
        pygame.draw.rect(screen, (65, 130, 255), add_rect, border_radius=16)    # button
        highlight_rect = add_rect.inflate(-8*scale, -add_rect.height//2)
        highlight_surf = pygame.Surface(highlight_rect.size, pygame.SRCALPHA)
        pygame.draw.ellipse(highlight_surf, (255,255,255,38), highlight_surf.get_rect())
        screen.blit(highlight_surf, highlight_rect.topleft)
        add_text = font.render("+ Add Replay", True, (255,255,255))
        screen.blit(add_text, (add_rect.x + add_rect.width//2 - add_text.get_width()//2,
                            add_rect.y + add_rect.height//2 - add_text.get_height()//2))

        # --- Dropdown Button (top right) ---
        dropdown_button_w = 300 * scale
        dropdown_button_h = 48 * scale
        dropdown_button_x = width - pad - dropdown_button_w
        dropdown_button_y = pad
        dropdown_button_rect = pygame.Rect(dropdown_button_x, dropdown_button_y, dropdown_button_w, dropdown_button_h)
        pygame.draw.rect(screen, (50, 50, 110), dropdown_button_rect, border_radius=12)
        dropdown_label = font.render("Toggle Players ▼", True, (200, 200, 255))
        screen.blit(dropdown_label, (dropdown_button_rect.x + 12*scale, dropdown_button_rect.y + dropdown_button_h/2 - dropdown_label.get_height()/2))

        # --- Dropdown List ---
        dropdown_checkbox_rects.clear()
        if dropdown_open:
            max_dropdown_height = height - (dropdown_button_y + dropdown_button_h + pad)
            dropdown_width = dropdown_button_w
            # Height per player checkbox + padding
            cb_height = int(36 * scale)
            total_dropdown_height = cb_height * len(players)
            dropdown_height = min(total_dropdown_height, max_dropdown_height)

            dropdown_rect = pygame.Rect(dropdown_button_x, dropdown_button_y + dropdown_button_h + 4, dropdown_width, dropdown_height)
            pygame.draw.rect(screen, (25, 25, 60), dropdown_rect, border_radius=12)
            pygame.draw.rect(screen, (80, 80, 180), dropdown_rect, 2, border_radius=12)

            # Scrollbar for dropdown if needed
            dropdown_scrollbar_width = 12 * scale
            dropdown_scrollbar_rect = pygame.Rect(dropdown_rect.right - dropdown_scrollbar_width, dropdown_rect.y, dropdown_scrollbar_width, dropdown_rect.height)
            pygame.draw.rect(screen, (50, 50, 100), dropdown_scrollbar_rect, border_radius=6)

            dropdown_scroll_max = max(0, total_dropdown_height - dropdown_height)
            if dropdown_scroll_max > 0:
                thumb_height = max(30, dropdown_scrollbar_rect.height * dropdown_height / total_dropdown_height)
                thumb_y = dropdown_scrollbar_rect.y + (-dropdown_scroll_offset / dropdown_scroll_max) * (dropdown_scrollbar_rect.height - thumb_height)
            else:
                thumb_height = dropdown_scrollbar_rect.height
                thumb_y = dropdown_scrollbar_rect.y

            dropdown_thumb_rect = pygame.Rect(dropdown_scrollbar_rect.x, thumb_y, dropdown_scrollbar_width, thumb_height)
            pygame.draw.rect(screen, (150, 150, 210), dropdown_thumb_rect, border_radius=6)

            # Draw player checkboxes inside dropdown with scroll offset
            y_offset = dropdown_rect.y + dropdown_scroll_offset
            cb_size = int(28 * scale)
            for pname in players:
                cb_rect = pygame.Rect(dropdown_rect.x + 12 * scale, y_offset, cb_size, cb_size)
                color = player_color_map_all[pname]
                pygame.draw.rect(screen, BG, cb_rect, border_radius=7)
                pygame.draw.rect(screen, color, cb_rect, 3, border_radius=7)
                if player_enabled[pname]:
                    pygame.draw.line(screen, color, (cb_rect.x + 6, cb_rect.y + cb_size//2), (cb_rect.x + cb_size//2, cb_rect.y + cb_size - 7), 3)
                    pygame.draw.line(screen, color, (cb_rect.x + cb_size//2, cb_rect.y + cb_size - 7), (cb_rect.x + cb_size - 7, cb_rect.y + 7), 3)
                pname_label = playerfont.render(pname, True, color)
                screen.blit(pname_label, (cb_rect.right + 8, cb_rect.y + cb_size//2 - pname_label.get_height()//2))
                dropdown_checkbox_rects.append((cb_rect, pname))
                y_offset += cb_size + 8

        # --- Player Summaries ---
        # We add a max width so summary area does not overlap dropdown on the right
        max_summary_width = width - pad * 3 - dropdown_button_w
        summary_left = pad
        summary_top = pad + 44*scale + int(32*scale) + 20*scale

        y_offset = summary_top
        for pi, pname in enumerate(players):
            if not player_enabled[pname]: 
                continue
            color = player_color_map_all[pname]
            pname_label = playerfont.render(pname, True, color)
            screen.blit(pname_label, (summary_left, y_offset+2))

            filtered_data = [row for row in unit_creation_data_all if row['player'] == pname and row['time_sec'] <= playhead_time]
            summary_counts = {}
            for unit_data in filtered_data:
                unit_id = unit_data['name']
                summary_counts[unit_id] = summary_counts.get(unit_id, 0) + 1
            summary_items = sorted(summary_counts.items(), key=lambda x: (-x[1], x[0]))

            row_icon_count = max(1, max_summary_width // (icon_box_size + icon_pad))
            icons_per_row = row_icon_count

            for idx, (unit, num) in enumerate(summary_items):
                col = idx % icons_per_row
                row = idx // icons_per_row
                x = summary_left + col * (icon_box_size + icon_pad)
                y = y_offset + pname_label.get_height() + row * (icon_box_size + icon_pad)
                box_rect = pygame.Rect(x, y, icon_box_size, icon_box_size)
                pygame.draw.rect(screen, ICON_BG, box_rect, border_radius=8)
                pygame.draw.rect(screen, color, box_rect, 3, border_radius=8)
                img_path = unit_icons.get(unit, default_icon_path)
                if not os.path.exists(img_path):
                    img_path = default_icon_path
                if img_path not in img_cache:
                    try:
                        img_cache[img_path] = pygame.image.load(img_path).convert_alpha()
                    except Exception:
                        img_cache[img_path] = pygame.Surface((icon_box_size, icon_box_size))
                        img_cache[img_path].fill((180,180,180))
                icon_img = pygame.transform.smoothscale(img_cache[img_path], (icon_size, icon_size))
                screen.blit(icon_img, (x + (icon_box_size-icon_size)//2, y + (icon_box_size-icon_size)//2))
                count_text = smallfont.render(f"{num}", True, color)
                screen.blit(count_text, (x+icon_box_size-15, y+5))

            max_icon_row = (len(summary_items) - 1) // icons_per_row if summary_items else 0
            y_offset += pname_label.get_height() + (max_icon_row + 1) * (icon_box_size + icon_pad) + player_gap

        # --- Clock and Next-Icon(s) ---
        clock_y = y_offset + int(28*scale)
        clock_label = bigclock.render(format_time(playhead_time), True, (255, 255, 140))
        clock_rect = clock_label.get_rect(center=(width//2, clock_y))
        screen.blit(clock_label, clock_rect)

        for i, pname in enumerate(players):
            if not player_enabled[pname]: 
                continue
            color = player_color_map_all[pname]
            future_events = [row for row in unit_creation_data_all if row['player'] == pname and row['time_sec'] > playhead_time]
            if future_events:
                next_event = min(future_events, key=lambda r: r['time_sec'])
                img_path = unit_icons.get(next_event['name'], default_icon_path)
                if not os.path.exists(img_path):
                    img_path = default_icon_path
                if img_path not in img_cache:
                    try:
                        img_cache[img_path] = pygame.image.load(img_path).convert_alpha()
                    except Exception:
                        img_cache[img_path] = pygame.Surface((next_icon_size, next_icon_size))
                        img_cache[img_path].fill((180,180,180))
                icon_img = pygame.transform.smoothscale(img_cache[img_path], (next_icon_size, next_icon_size))
                cx = clock_rect.right + 18 + i*(next_icon_size + next_icon_pad)
                cy = clock_rect.centery - next_icon_size//2
                box_rect = pygame.Rect(cx, cy, next_icon_size, next_icon_size)
                pygame.draw.rect(screen, BG, box_rect, border_radius=8)
                pygame.draw.rect(screen, color, box_rect, 4, border_radius=8)
                screen.blit(icon_img, (cx + (next_icon_size-icon_size)//2, cy + (next_icon_size-icon_size)//2))
                tt = smallfont.render(format_time(next_event['time_sec']), True, color)
                screen.blit(tt, (cx + next_icon_size//2 - tt.get_width()//2, cy + next_icon_size + 1))
                name_label = smallfont.render(next_event['name'], True, color)
                name_x = cx + next_icon_size//2 - name_label.get_width()//2
                name_y = cy + next_icon_size + tt.get_height() + 5
                screen.blit(name_label, (name_x, name_y))

        # --- Slider under clock ---
        slider_width = int(width * 0.82)
        slider_height = int(12 * scale)
        slider_left = width // 2 - slider_width // 2
        slider_top = clock_rect.bottom + int(36 * scale)
        slider_track_rect = pygame.Rect(slider_left, slider_top, slider_width, slider_height)
        pygame.draw.rect(screen, (225,225,225), slider_track_rect, border_radius=3)
        pygame.draw.rect(screen, (180,180,180), slider_track_rect, 1, border_radius=3)
        slider_percent = playhead_time / max_time_sec if max_time_sec > 0 else 0
        thumb_x = int(slider_left + slider_percent * slider_width)
        thumb_rect = pygame.Rect(thumb_x - 7, slider_top - 6, 14, slider_height + 12)
        pygame.draw.rect(screen, (200, 210, 255), thumb_rect, border_radius=2)
        pygame.draw.rect(screen, (120, 180, 255), thumb_rect, 2, border_radius=2)

        play_rect = pygame.Rect(slider_track_rect.right + 18, slider_track_rect.y - 6, 36, 36)
        if is_playing:
            pygame.draw.rect(screen, (200,255,180), play_rect, border_radius=8)
            pygame.draw.rect(screen, (30,120,30), play_rect, 3, border_radius=8)
            x = play_rect.x + 10
            y = play_rect.y + 7
            pygame.draw.rect(screen, (30,120,30), (x, y, 6, 22))
            pygame.draw.rect(screen, (30,120,30), (x + 15, y, 6, 22))
        else:
            pygame.draw.rect(screen, (180,210,255), play_rect, border_radius=8)
            pygame.draw.rect(screen, (40,90,160), play_rect, 3, border_radius=8)
            x = play_rect.x + 12
            y = play_rect.y + 7
            pygame.draw.polygon(screen, (40,90,160), [(x, y), (x, y + 22), (x + 16, y + 11)])

        # --- PATCH: Timeline Zoom & Centering ---
        timeline_start_y = slider_track_rect.bottom + int(34*scale)
        timeline_height = timeline_area_height
        timeline_left = int(width*0.08)
        timeline_right = int(width*0.92)
        timeline_width = timeline_right - timeline_left

        visible_seconds = max_time_sec / timeline_zoom if timeline_zoom > 0 else max_time_sec
        if visible_seconds >= max_time_sec:
            t0 = 0
            t1 = max_time_sec
        else:
            center = playhead_time if timeline_view_center is None else timeline_view_center
            t0 = max(0, center - visible_seconds / 2)
            t1 = min(max_time_sec, t0 + visible_seconds)
            if t1 - t0 < visible_seconds:
                t0 = max(0, max_time_sec - visible_seconds)
                t1 = max_time_sec

        px_per_sec = timeline_width / max(1, (t1 - t0))
        zoom_label = font.render(f"Zoom: {timeline_zoom:.2f}x  (+/- or mouse wheel)", True, (160, 160, 160))
        screen.blit(zoom_label, (slider_left, slider_top - 28))

        # --- Timelines (for each player) ---
        timeline_y = timeline_start_y
        for i, pname in enumerate(players):
            if not player_enabled[pname]:
                continue
            color = player_color_map_all[pname]
            timeline_events = [row for row in unit_creation_data_all if row['player'] == pname and t0 <= row['time_sec'] <= t1]
            events_by_time = {}
            for event in timeline_events:
                events_by_time.setdefault(event['time_sec'], []).append(event)
            bar_y = timeline_y + timeline_icon_size // 2 + 2
            bar_rect = pygame.Rect(timeline_left, bar_y, timeline_width, 6)
            pygame.draw.rect(screen, BAR, bar_rect, border_radius=6)
            pygame.draw.rect(screen, BAR_BG, bar_rect, 2, border_radius=6)
            for tsec, events in events_by_time.items():
                x = timeline_left + int((tsec - t0) * px_per_sec)
                stack_n = len(events)
                total_height = stack_n * timeline_icon_size + (stack_n - 1) * 2
                for stack_idx, event in enumerate(events):
                    y_offset = bar_y - total_height // 2 + stack_idx * (timeline_icon_size + 2)
                    img_path = unit_icons.get(event['name'], default_icon_path)
                    if not os.path.exists(img_path):
                        img_path = default_icon_path
                    if img_path not in img_cache:
                        try:
                            img_cache[img_path] = pygame.image.load(img_path).convert_alpha()
                        except Exception:
                            img_cache[img_path] = pygame.Surface((timeline_icon_size, timeline_icon_size))
                            img_cache[img_path].fill((180, 180, 180))
                    icon_img = pygame.transform.smoothscale(img_cache[img_path], (timeline_icon_size, timeline_icon_size))
                    icon_rect = pygame.Rect(x - timeline_icon_size // 2, y_offset, timeline_icon_size, timeline_icon_size)
                    if event['time_sec'] <= playhead_time:
                        pygame.draw.rect(screen, color, icon_rect.inflate(6, 6), 3, border_radius=8)
                    else:
                        pygame.draw.rect(screen, color, icon_rect, 1, border_radius=8)
                    screen.blit(icon_img, icon_rect.topleft)
            playhead_x = timeline_left + int((playhead_time - t0) * px_per_sec)
            pygame.draw.line(screen, HIGHLIGHT, (playhead_x, bar_y - 30), (playhead_x, bar_y + timeline_icon_size + 20), 4)
            timeline_y += timeline_height + int(12 * scale)

        # --- Build List ---
        buildlist_y = timeline_y + int(25 * scale)
        buildlist_x = pad
        max_buildlist_width = width - pad * 2 - dropdown_button_w - 10  # leave space for dropdown on right
        buildlist_w = max_buildlist_width
        buildlist_h = height - buildlist_y - pad
        buildlist_colgap = int(35 * scale)
        buildlist_line_height = int(30 * scale)
        buildlist_font = pygame.font.SysFont("Consolas", int(23 * scale))
        buildlist_header_font = pygame.font.SysFont("Consolas", int(25 * scale), bold=True)
        player_buildlist_gap = int(48 * scale)

        # Calculate total build list height for scroll clamp
        estimated_total_height = 0
        buildlist_per_player_rows = []
        for pi, pname in enumerate(players):
            if not player_enabled[pname]:
                buildlist_per_player_rows.append(0)
                continue
            player_events = [row for row in unit_creation_data_all if row['player'] == pname]
            row_count = len(player_events)
            buildlist_per_player_rows.append(row_count)
            estimated_total_height += (row_count + 2) * buildlist_line_height + player_buildlist_gap
        max_scroll = max(0, estimated_total_height - buildlist_h)
        scroll_offset = max(-max_scroll, min(0, scroll_offset))

        # Buildlist surface with clipping for scroll
        buildlist_surface = pygame.Surface((buildlist_w, buildlist_h))
        buildlist_surface.fill(BG)

        # Draw build list to surface
        current_y = scroll_offset
        for pi, pname in enumerate(players):
            if not player_enabled[pname]:
                continue
            color = player_color_map_all[pname]
            header_label = buildlist_header_font.render(pname, True, color)
            buildlist_surface.blit(header_label, (0, current_y))
            header_y = current_y + buildlist_line_height
            col0 = 0
            col1 = col0 + int(260 * scale)
            col2 = col1 + int(90 * scale)
            col3 = col2 + int(140 * scale)
            col_headers = [
                buildlist_font.render("Time", True, color),
                buildlist_font.render("Category", True, color),
                buildlist_font.render("Name", True, color)
            ]
            buildlist_surface.blit(col_headers[0], (col1, header_y))
            buildlist_surface.blit(col_headers[1], (col2, header_y))
            buildlist_surface.blit(col_headers[2], (col3, header_y))

            player_events = sorted([row for row in unit_creation_data_all if row['player'] == pname], key=lambda r: r['time_sec'])
            for rowidx, row in enumerate(player_events):
                y = header_y + (rowidx + 1) * buildlist_line_height
                if rowidx % 2 == 1:
                    pygame.draw.rect(buildlist_surface, (28, 28, 28), (col0, y, buildlist_w, buildlist_line_height))
                buildlist_surface.blit(buildlist_font.render(row['time'], True, color), (col1, y))
                buildlist_surface.blit(buildlist_font.render(row['category'], True, color), (col2, y))
                buildlist_surface.blit(buildlist_font.render(row['name'], True, color), (col3, y))
            current_y += (len(player_events) + 2) * buildlist_line_height + player_buildlist_gap

        # Blit buildlist surface to screen
        screen.blit(buildlist_surface, (buildlist_x, buildlist_y))

        # --- Build List Scrollbar ---
        if max_scroll > 0:
            scrollbar_width = int(14 * scale)
            scrollbar_x = buildlist_x + buildlist_w + 4
            scrollbar_y = buildlist_y
            scrollbar_h = buildlist_h
            scrollbar_rect = pygame.Rect(scrollbar_x, scrollbar_y, scrollbar_width, scrollbar_h)
            pygame.draw.rect(screen, (50, 50, 50), scrollbar_rect, border_radius=7)

            # Calculate scrollbar thumb height proportional to visible area
            thumb_height = max(30, scrollbar_h * buildlist_h / (buildlist_h + max_scroll))
            # Calculate thumb position based on scroll offset
            thumb_y = scrollbar_y + (-scroll_offset / max_scroll) * (scrollbar_h - thumb_height)
            scrollbar_thumb_rect = pygame.Rect(scrollbar_x, thumb_y, scrollbar_width, thumb_height)
            pygame.draw.rect(screen, (150, 150, 210), scrollbar_thumb_rect, border_radius=7)
        else:
            scrollbar_rect = None
            scrollbar_thumb_rect = None

        pygame.display.flip()

    pygame.quit()

if __name__ == "__main__":
    create_pygame_with_multi_replay()
