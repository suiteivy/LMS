#!/usr/bin/env python3
"""
Automatic School Timetable Solver using Integer Linear Programming (MILP) with PuLP.
Designed for CBC Curriculum & Senior Secondary Track-Based Elective Streams.

Room Number Handling:
Per system specification, 'room_number' represents the class's own identity / name
(e.g., 'Grade 4 East', 'Grade 10 STEM A'), NOT a physical room. Physical room double-booking
is omitted. Parallel elective sessions for Senior Secondary are distinguished purely by
Subject and Eligible Teacher.
"""

import sys
import json
import math
from typing import Dict, Any, List, Optional
import pulp

def diagnose_bottlenecks(data: Dict[str, Any]) -> List[str]:
    """Diagnose mathematical or resource over-subscription bottlenecks before or after solver failure."""
    diagnostics = []
    days = data.get("days", ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])
    periods = [p for p in data.get("periods", []) if not p.get("is_break", False)]
    total_slots = len(days) * len(periods)

    classes_map = {c["id"]: c for c in data.get("classes", [])}
    teachers_map = {t["id"]: t for t in data.get("teachers", [])}
    
    # 1. Check each class weekly period budget
    class_demands: Dict[str, int] = {c_id: 0 for c_id in classes_map}
    for req in data.get("subject_requirements", []):
        c_id = req["class_id"]
        class_demands[c_id] = class_demands.get(c_id, 0) + req.get("periods_per_week", 0)

    for cluster in data.get("senior_secondary_tracks", []):
        for c_id in cluster.get("classes", []):
            class_demands[c_id] = class_demands.get(c_id, 0) + cluster.get("periods_per_week", 0)

    for c_id, total_dem in class_demands.items():
        c_name = classes_map.get(c_id, {}).get("name", c_id)
        if total_dem > total_slots:
            diagnostics.append(
                f"Class '{c_name}' requires {total_dem} periods/week, but only {total_slots} teaching slots are available ({len(days)} days x {len(periods)} periods)."
            )

    # 2. Check each teacher minimum workload vs total available slots
    teacher_demands: Dict[str, int] = {}
    for req in data.get("subject_requirements", []):
        eligible = req.get("eligible_teachers", [])
        if not eligible:
            c_name = classes_map.get(req["class_id"], {}).get("name", req["class_id"])
            s_name = req.get("subject_name", req.get("subject_id"))
            diagnostics.append(f"Subject '{s_name}' in class '{c_name}' has no assigned eligible teachers.")
        elif len(eligible) == 1:
            t_id = eligible[0]
            teacher_demands[t_id] = teacher_demands.get(t_id, 0) + req.get("periods_per_week", 0)

    for cluster in data.get("senior_secondary_tracks", []):
        for opt in cluster.get("options", []):
            t_id = opt.get("teacher_id")
            if t_id:
                teacher_demands[t_id] = teacher_demands.get(t_id, 0) + cluster.get("periods_per_week", 0)

    for t_id, total_dem in teacher_demands.items():
        t_name = teachers_map.get(t_id, {}).get("name", t_id)
        if total_dem > total_slots:
            diagnostics.append(
                f"Teacher '{t_name}' is assigned {total_dem} required periods/week as the sole eligible teacher, exceeding the total weekly slots ({total_slots})."
            )

    return diagnostics


def solve_timetable(data: Dict[str, Any]) -> Dict[str, Any]:
    days = data.get("days", ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])
    periods_raw = data.get("periods", [])
    teaching_periods = [p for p in periods_raw if not p.get("is_break", False)]
    teaching_periods.sort(key=lambda p: p["period_number"])

    if not teaching_periods:
        return {"success": False, "error": "No valid teaching periods provided in configuration."}

    classes = data.get("classes", [])
    classes_map = {c["id"]: c for c in classes}
    teachers = data.get("teachers", [])
    teachers_map = {t["id"]: t for t in teachers}
    subject_reqs = data.get("subject_requirements", [])
    senior_clusters = data.get("senior_secondary_tracks", [])

    pre_diagnostics = diagnose_bottlenecks(data)
    if pre_diagnostics:
        return {
            "success": False,
            "status": "INFEASIBLE_PRECHECK",
            "diagnostics": pre_diagnostics
        }

    # Configuration limits
    max_periods_per_day_per_teacher = data.get("teacher_max_periods_per_day", 6)
    
    # Teacher unavailability lookup: (teacher_id, day, period_num) -> bool
    unavailability = set()
    for un in data.get("teacher_unavailability", []):
        unavailability.add((un["teacher_id"], un["day_of_week"], un["period_number"]))

    # PuLP Model
    model = pulp.LpProblem("School_Timetable_MILP", pulp.LpMinimize)

    # Variables for standard subject periods:
    # x[req_idx, teacher_id, day, period_number] in {0, 1}
    x_vars = {}
    for req_idx, req in enumerate(subject_reqs):
        eligible = req.get("eligible_teachers", [])
        for t_id in eligible:
            for day in days:
                for p in teaching_periods:
                    p_num = p["period_number"]
                    if (t_id, day, p_num) in unavailability:
                        continue
                    var_name = f"x_{req_idx}_{t_id}_{day}_{p_num}"
                    x_vars[(req_idx, t_id, day, p_num)] = pulp.LpVariable(var_name, cat=pulp.LpBinary)

    # Variables for Senior Secondary elective clusters:
    # y[cluster_idx, day, period_number] in {0, 1}
    y_vars = {}
    for c_idx, cluster in enumerate(senior_clusters):
        for day in days:
            for p in teaching_periods:
                p_num = p["period_number"]
                # Check if any teacher in this cluster is unavailable
                any_unavail = False
                for opt in cluster.get("options", []):
                    t_id = opt.get("teacher_id")
                    if t_id and (t_id, day, p_num) in unavailability:
                        any_unavail = True
                        break
                if any_unavail:
                    continue
                var_name = f"y_{c_idx}_{day}_{p_num}"
                y_vars[(c_idx, day, p_num)] = pulp.LpVariable(var_name, cat=pulp.LpBinary)

    # --- HARD CONSTRAINTS ---

    # 1. Subject Requirement Period Quota:
    # Each requirement must be scheduled exactly periods_per_week times
    for req_idx, req in enumerate(subject_reqs):
        target = req.get("periods_per_week", 0)
        vars_for_req = [
            x_vars[(req_idx, t_id, day, p["period_number"])]
            for t_id in req.get("eligible_teachers", [])
            for day in days
            for p in teaching_periods
            if (req_idx, t_id, day, p["period_number"]) in x_vars
        ]
        if vars_for_req:
            model += pulp.lpSum(vars_for_req) == target, f"Quota_Req_{req_idx}"
        elif target > 0:
            return {
                "success": False,
                "status": "INFEASIBLE",
                "diagnostics": [f"Cannot schedule subject requirement {req.get('subject_name')} for class {req.get('class_id')}: No available teacher slots."]
            }

    # Elective Cluster Quotas:
    for c_idx, cluster in enumerate(senior_clusters):
        target = cluster.get("periods_per_week", 0)
        vars_for_cluster = [
            y_vars[(c_idx, day, p["period_number"])]
            for day in days
            for p in teaching_periods
            if (c_idx, day, p["period_number"]) in y_vars
        ]
        if vars_for_cluster:
            model += pulp.lpSum(vars_for_cluster) == target, f"Quota_Cluster_{c_idx}"
        elif target > 0:
            return {
                "success": False,
                "status": "INFEASIBLE",
                "diagnostics": [f"Cannot schedule elective cluster {cluster.get('slot_id', c_idx)}: No available slots without teacher unavailability conflict."]
            }

    # 2. Class Conflict Constraint:
    # A class can have at most 1 lesson at any time period (day, p_num)
    for class_id in classes_map:
        # Which reqs belong to this class?
        req_indices = [idx for idx, req in enumerate(subject_reqs) if req["class_id"] == class_id]
        # Which clusters include this class?
        cluster_indices = [idx for idx, c in enumerate(senior_clusters) if class_id in c.get("classes", [])]

        for day in days:
            for p in teaching_periods:
                p_num = p["period_number"]
                slot_vars = []
                for r_idx in req_indices:
                    for t_id in subject_reqs[r_idx].get("eligible_teachers", []):
                        if (r_idx, t_id, day, p_num) in x_vars:
                            slot_vars.append(x_vars[(r_idx, t_id, day, p_num)])
                for c_idx in cluster_indices:
                    if (c_idx, day, p_num) in y_vars:
                        slot_vars.append(y_vars[(c_idx, day, p_num)])

                if slot_vars:
                    model += pulp.lpSum(slot_vars) <= 1, f"ClassConflict_{class_id}_{day}_{p_num}"

    # 3. Teacher Conflict Constraint:
    # A teacher can teach at most 1 lesson across all classes/elective clusters at (day, p_num)
    for teacher_id in teachers_map:
        for day in days:
            for p in teaching_periods:
                p_num = p["period_number"]
                teacher_slot_vars = []
                # Check standard requirements
                for req_idx, req in enumerate(subject_reqs):
                    if teacher_id in req.get("eligible_teachers", []):
                        if (req_idx, teacher_id, day, p_num) in x_vars:
                            teacher_slot_vars.append(x_vars[(req_idx, teacher_id, day, p_num)])
                # Check elective clusters
                for c_idx, cluster in enumerate(senior_clusters):
                    for opt in cluster.get("options", []):
                        if opt.get("teacher_id") == teacher_id:
                            if (c_idx, day, p_num) in y_vars:
                                teacher_slot_vars.append(y_vars[(c_idx, day, p_num)])

                if teacher_slot_vars:
                    model += pulp.lpSum(teacher_slot_vars) <= 1, f"TeacherConflict_{teacher_id}_{day}_{p_num}"

    # 4. Maximum Daily Lessons per Subject for a Class:
    # Prevents cramming all 4-5 weekly periods of Math or English into 1 or 2 days
    for req_idx, req in enumerate(subject_reqs):
        periods_per_week = req.get("periods_per_week", 0)
        allow_double = req.get("allow_double", True)
        default_max_per_day = 2 if (allow_double and periods_per_week >= 4) else (1 if periods_per_week <= 3 else 2)
        max_per_day = req.get("max_per_day", default_max_per_day)

        for day in days:
            day_req_vars = [
                x_vars[(req_idx, t_id, day, p["period_number"])]
                for t_id in req.get("eligible_teachers", [])
                for p in teaching_periods
                if (req_idx, t_id, day, p["period_number"]) in x_vars
            ]
            if day_req_vars:
                model += pulp.lpSum(day_req_vars) <= max_per_day, f"MaxDailySubj_{req_idx}_{day}"

    # 5. Teacher Daily Maximum Workload:
    for teacher_id in teachers_map:
        for day in days:
            day_teacher_vars = []
            for req_idx, req in enumerate(subject_reqs):
                if teacher_id in req.get("eligible_teachers", []):
                    for p in teaching_periods:
                        p_num = p["period_number"]
                        if (req_idx, teacher_id, day, p_num) in x_vars:
                            day_teacher_vars.append(x_vars[(req_idx, teacher_id, day, p_num)])
            for c_idx, cluster in enumerate(senior_clusters):
                for opt in cluster.get("options", []):
                    if opt.get("teacher_id") == teacher_id:
                        for p in teaching_periods:
                            p_num = p["period_number"]
                            if (c_idx, day, p_num) in y_vars:
                                day_teacher_vars.append(y_vars[(c_idx, day, p_num)])

            if day_teacher_vars:
                model += pulp.lpSum(day_teacher_vars) <= max_periods_per_day_per_teacher, f"TeacherMaxDay_{teacher_id}_{day}"

    # --- OBJECTIVE FUNCTION (SOFT CONSTRAINTS & FAIRNESS) ---
    # Core subjects preference for morning periods (lower period_number = lower penalty)
    # Even subject dispersion across the week
    obj_terms = []

    # Subject priority weight (e.g., Mathematics, Sciences prefer earlier periods)
    core_keywords = ["math", "science", "english", "kiswahili", "biology", "chemistry", "physics"]
    
    for req_idx, req in enumerate(subject_reqs):
        s_name_lower = str(req.get("subject_name", "")).lower()
        is_core = any(k in s_name_lower for k in core_keywords)
        
        for t_id in req.get("eligible_teachers", []):
            for day in days:
                for p in teaching_periods:
                    p_num = p["period_number"]
                    if (req_idx, t_id, day, p_num) in x_vars:
                        # Period penalty: later periods penalize core subjects slightly
                        cost = (p_num * 2.0) if is_core else (p_num * 0.5)
                        obj_terms.append(cost * x_vars[(req_idx, t_id, day, p_num)])

    for c_idx, cluster in enumerate(senior_clusters):
        for day in days:
            for p in teaching_periods:
                p_num = p["period_number"]
                if (c_idx, day, p_num) in y_vars:
                    obj_terms.append(p_num * 1.0 * y_vars[(c_idx, day, p_num)])

    model += pulp.lpSum(obj_terms)

    # Solve using CBC solver
    solver = pulp.PULP_CBC_CMD(msg=False, timeLimit=60)
    solve_status = model.solve(solver)
    status_str = pulp.LpStatus[solve_status]

    if status_str not in ["Optimal", "Integer"]:
        post_diagnostics = diagnose_bottlenecks(data)
        if not post_diagnostics:
            post_diagnostics = [
                "Could not find a conflict-free schedule satisfying all teacher availability and subject period quotas.",
                "Try relaxing daily limits, increasing available periods, or assigning additional eligible teachers to bottleneck subjects."
            ]
        return {
            "success": False,
            "status": status_str,
            "diagnostics": post_diagnostics
        }

    # Extract resulting timetable entries
    period_info_by_num = {p["period_number"]: p for p in teaching_periods}
    scheduled_entries = []

    # 1. Standard subjects
    for (req_idx, t_id, day, p_num), var in x_vars.items():
        if pulp.value(var) is not None and round(pulp.value(var)) == 1:
            req = subject_reqs[req_idx]
            c_info = classes_map.get(req["class_id"], {})
            p_info = period_info_by_num.get(p_num, {})
            # room_number represents class identity/name
            class_name = c_info.get("name", f"Class {req['class_id']}")
            
            scheduled_entries.append({
                "class_id": req["class_id"],
                "subject_id": req["subject_id"],
                "teacher_id": t_id,
                "day_of_week": day,
                "period_number": p_num,
                "start_time": p_info.get("start_time", "08:00"),
                "end_time": p_info.get("end_time", "08:45"),
                "room_number": class_name,
                "is_elective": False,
                "track_id": None,
                "subject_name": req.get("subject_name"),
                "teacher_name": teachers_map.get(t_id, {}).get("name", "Assigned Teacher")
            })

    # 2. Senior Secondary elective clusters (parallel simultaneous sessions)
    for (c_idx, day, p_num), var in y_vars.items():
        if pulp.value(var) is not None and round(pulp.value(var)) == 1:
            cluster = senior_clusters[c_idx]
            p_info = period_info_by_num.get(p_num, {})
            classes_in_cluster = cluster.get("classes", [])

            for opt_idx, opt in enumerate(cluster.get("options", [])):
                t_id = opt.get("teacher_id")
                # Assign to target classes in the cluster
                target_class_id = opt.get("target_class_id") or (classes_in_cluster[opt_idx % len(classes_in_cluster)] if classes_in_cluster else None)
                c_info = classes_map.get(target_class_id, {})
                class_name = c_info.get("name", f"Track Group {cluster.get('slot_id', '')}")

                scheduled_entries.append({
                    "class_id": target_class_id,
                    "subject_id": opt["subject_id"],
                    "teacher_id": t_id,
                    "day_of_week": day,
                    "period_number": p_num,
                    "start_time": p_info.get("start_time", "08:00"),
                    "end_time": p_info.get("end_time", "08:45"),
                    "room_number": class_name,
                    "is_elective": True,
                    "track_id": opt.get("track_id"),
                    "subject_name": opt.get("subject_name"),
                    "teacher_name": teachers_map.get(t_id, {}).get("name", "Elective Teacher")
                })

    return {
        "success": True,
        "status": status_str,
        "entries": scheduled_entries,
        "total_scheduled": len(scheduled_entries),
        "days": days,
        "teaching_periods": [p["period_number"] for p in teaching_periods]
    }


def main():
    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            print(json.dumps({"success": False, "error": "Empty input provided."}))
            sys.exit(1)
        data = json.loads(raw_input)
        result = solve_timetable(data)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
