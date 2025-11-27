import { Component } from "@angular/core";
import { Router } from "@angular/router";

interface MenuItem {
  title: string;
  route?: string;
  icon?: string;
  submenu?: MenuItem[];
}

@Component({
  selector: "app-sidebar",
  templateUrl: "./sidebar.component.html",
  styleUrls: ["./sidebar.component.scss"],
})
export class SidebarComponent {
  menuItems: MenuItem[] = [
    {
      title: "Dashboard",
      route: "/dashboard",
      icon: "dashboard",
    },
    {
      title: "Vendor Management",
      icon: "people",
      submenu: [
        { title: "Registration", route: "/vendor/register" },
        { title: "All Vendors", route: "/vendor/list" },
        { title: "Site Management", route: "/vendor/sites" },
        { title: "Excel Import", route: "/vendor/excel-import" },
      ],
    },
    {
      title: "Employee Management",
      icon: "work",
      submenu: [
        { title: "Registration", route: "/employee/register" },
        { title: "All Employees", route: "/employee/list" },
        { title: "Salary Structure", route: "/employee/salary" },
      ],
    },
  ];

  constructor(private router: Router) {}

  navigate(route?: string): void {
    if (route) {
      this.router.navigate([route]);
    }
  }

  isActive(route?: string): boolean {
    return route ? this.router.url === route : false;
  }
}
