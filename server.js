import { ApolloServer } from "@apollo/server";
import { GraphQLError } from "graphql";
import { startStandaloneServer } from "@apollo/server/standalone";
import bcrypt from "bcrypt";
import { database, port, tredumoDB, postgraduateDB } from "./config/config.js";
import generateRandomString from "./utilities/genrateSystemPwd.js";
import getNextStdNumber from "./utilities/generateStdno.js";

import { typeDefs } from "./schema/schema.js";

const resolvers = {
  Query: {
    async acc_yrs() {
      const acc_yrs = await database("acc_yrs").orderBy("acc_yr_id", "DESC");
      //   console.log("year", acc_yrs);
      return acc_yrs;
    },
    async schemes() {
      return await database("scheme_categories");
    },
    async intakes() {
      return await database("intakes");
    },
    async scheme(parent, args) {
      const result = await database("schemes")
        .where({
          acc_yr: args.acc_yr,
          intake_id: args.intake_id,
          scheme_category_id: args.scheme_category_id,
        })
        .first();
      return result;
    },
    async program_choices(parent, args) {
      const scheme = await database("schemes")
        .where({
          acc_yr: args.acc_yr,
          intake_id: args.intake_id,
          scheme_category_id: args.scheme_category_id,
        })
        .first();

      if (scheme) {
        // fetching only the fully filled forms
        const result = await database("applicant_program_choices")
          .join(
            "applicant_bio_data",
            "applicant_program_choices.applicant_id",
            "applicant_bio_data.applicant_id"
          )
          .where({
            choice: 1,
          })
          .where("applicant_program_choices.scheme_id", "=", scheme.id)
          .andWhere("applicant_bio_data.form_status", "=", 2)
          .groupBy("prog_id");

        // console.log(result);
        return result;
      } else {
        return [];
      }
    },
    // async applicant_bio_data(parent, args) {
    //   const result = await database("applicant_bio_data")
    //     .where({
    //       applicant_id: args.applicant_id,
    //       scheme_id: args.scheme_id,
    //     })
    //     .first();

    //   //   console.log(result);
    //   return result;
    // },
    // async other_qualifications(parent, args) {
    //   const result = await database("other_applicant_qualifications").where({
    //     applicant_id: args.applicant_id,
    //     scheme_id: args.scheme_id,
    //   });

    //   //   console.log(result);
    //   return result;
    // },
    async applicant_forms(parent, args) {
      // fetch only completed forms
      const prog_choices = await database("applicant_program_choices")
        .join(
          "applicant_bio_data",
          "applicant_bio_data.applicant_id",
          "applicant_program_choices.applicant_id"
        )
        .where({
          prog_id: args.program_id,
        })
        .where("applicant_program_choices.scheme_id", "=", args.scheme_id)
        .andWhere("applicant_bio_data.form_status", "=", 2);

      if (prog_choices.length > 0) {
        let arr = [];
        const x = prog_choices.map(async (choice) => {
          const result = await database("applicant_bio_data")
            .join(
              "admission-users",
              "applicant_bio_data.applicant_id",
              "admission-users.id"
            )
            .where({
              scheme_id: args.scheme_id,
              applicant_id: choice.applicant_id,
            })

            .first();

          arr.push(result);
        });

        await Promise.all(x);
        // console.log("result", arr);
        return arr;
      } else {
        return [];
      }
    },
    async staff_autocomplete(parent, args) {
      const results = await tredumoDB("staff").where(
        "staff_name",
        "like",
        `%${args.staff_name}%`
      );

      return results;
    },
    async staff_members(parent, args) {
      const results = await tredumoDB("staff");
      return results;
    },
    async user_roles(parent, args) {
      const results = await tredumoDB("staff_roles");
      // console.log("roles", results);
      return results;
    },
    async users(parent, args) {
      const results = await tredumoDB("management_users");
      // console.log("roles", results);
      return results;
    },
    async admissible_phd_applicants(parent, args) {
      const { acc_yr, intake_id } = args;
      if ((!acc_yr, !intake_id)) {
        throw new GraphQLError("An unexpected error occurred!");
      }

      let newArr = [];
      // the focus is on postgraduate stds with id = 2
      const scheme = await database("schemes")
        .where({
          acc_yr: acc_yr,
          intake_id: intake_id,
          category_id: 2,
        })
        .first();

      if (scheme) {
        // fetching only the sent postgraduate students that completed getting marks
        const sent_stds = await database("sent_post_grad_applicants")
          .join(
            "postgraduate_courses",
            "sent_post_grad_applicants.program_id",
            "postgraduate_courses.id"
          )
          .where({
            scheme_id: scheme.id,
            completed: 1,
          })
          .orderBy("date_sent", "DESC");

        if (sent_stds.length === 0) {
          return [];
        }

        // now fetching the biodata of the sent applicants
        const x = await sent_stds.map(async (std) => {
          const std_biodata = await database("applicant_bio_data")
            .join(
              "admission-users",
              "applicant_bio_data.applicant_id",
              "admission-users.id"
            )
            .where({
              applicant_id: std.applicant_id,
              scheme_id: std.scheme_id,
            })
            .first();

          newArr.push(std_biodata);
        });

        await Promise.all(x);

        return newArr;
      } else {
        return [];
      }
    },
  },
  Scheme: {
    async scheme_category(parent) {
      return await database("scheme_categories")
        .where({
          scheme_category_id: parent.scheme_category_id,
        })
        .first();
    },
    async intake(parent) {
      return await database("intakes")
        .where({
          id: parent.intake_id,
        })
        .first();
    },
    async admission_category(parent) {
      return await database("admission_categories")
        .where({
          id: parent.id,
        })
        .first();
    },
  },
  ProgramChoice: {
    async program(parent) {
      return await database("postgraduate_courses")
        .where({
          id: parent.prog_id,
        })
        .first();
    },
    async campus(parent) {
      return await database("campus")
        .where({
          cam_id: parent.campus_id,
        })
        .first();
    },
    async study_time(parent) {
      return await database("study_times")
        .where({
          id: parent.study_time_id,
        })
        .first();
    },
  },
  Program: {
    async studentcount(parent) {
      // const result = await database("applicant_program_choices")
      //   .where({
      //     prog_id: parent.id,
      //     choice: 1,
      //   })

      const result = await database("applicant_program_choices")
        .join(
          "applicant_bio_data",
          "applicant_program_choices.applicant_id",
          "applicant_bio_data.applicant_id"
        )
        .where({
          choice: 1,
          prog_id: parent.id,
        })
        // .where("applicant_program_choices.scheme_id", "=", scheme.id)
        .andWhere("applicant_bio_data.form_status", "=", 2)
        .groupBy("prog_id")
        .first()
        .count();

      // console.log("count", result);
      return result["count(*)"];
    },
  },
  OlevelInfo: {
    async olevel_results(parent) {
      const result = await database("applicant_olevel_subjects")
        .join(
          "olevel_subjects",
          "applicant_olevel_subjects.subject_code",
          "olevel_subjects.subject_code"
        )
        .where({
          applicant_olevel_info_id: parent.id,
        });

      // console.log("olevel", {
      //   parent,
      //   result,
      // });
      return result;
    },
  },
  OlevelResult: {
    async subject(parent) {
      return await database("olevel_subjects")
        .where({
          subject_code: parent.subject_code,
        })
        .first();
    },
  },
  AlevelInfo: {
    async alevel_results(parent) {
      return await database("applicant_alevel_subjects")
        .join(
          "alevel_subjects",
          "applicant_alevel_subjects.subject_code",
          "alevel_subjects.subject_code"
        )
        .where({
          applicant_alevel_info_id: parent.id,
        });
    },
  },
  AlevelResult: {
    async subject(parent) {
      return await database("alevel_subjects")
        .where({
          subject_code: parent.subject_code,
        })
        .first();
    },
  },
  ApplicantForm: {
    async scheme(parent) {
      return await database("schemes")
        .where({
          id: parent.scheme_id,
        })
        .first();
    },
    async prog_choices(parent) {
      return await database("applicant_program_choices").where({
        applicant_id: parent.applicant_id,
        scheme_id: parent.scheme_id,
      });
    },
    async other_qualifications(parent) {
      return await database("other_applicant_qualifications").where({
        applicant_id: parent.applicant_id,
        scheme_id: parent.scheme_id,
      });
    },
    async olevel_info(parent) {
      const result = await database("applicant_olevel_info")
        .where({
          applicant_id: parent.applicant_id,
          scheme_id: parent.scheme_id,
        })
        .first();
      // console.log("olevel info", { parent, result });
      return result;
    },
    async alevel_info(parent) {
      return await database("applicant_alevel_info")
        .where({
          applicant_id: parent.applicant_id,
          scheme_id: parent.scheme_id,
        })
        .first();
    },
    async referees(parent) {
      return await database("applicant_referees").where({
        applicant_id: parent.applicant_id,
        scheme_id: parent.scheme_id,
      });
    },
    async medical_history(parent) {
      return await database("applicant_medical_history")
        .where({
          applicant_id: parent.applicant_id,
          scheme_id: parent.scheme_id,
        })
        .first();
    },
    async next_of_kin(parent) {
      return await database("applicant_next_of_kin")
        .where({
          applicant_id: parent.applicant_id,
          scheme_id: parent.scheme_id,
        })
        .first();
    },
    async payments(parent) {
      return await database("applicant_payment").where({
        applicant_id: parent.applicant_id,
        scheme_id: parent.scheme_id,
      });
    },
    async sent_for_marks(parent) {
      const sent = await database("sent_post_grad_applicants")
        .where({
          applicant_id: parent.applicant_id,
          scheme_id: parent.scheme_id,
        })
        .first();

      if (sent) {
        return 1;
      } else {
        return 0;
      }
    },
    async application_sent_details(parent) {
      const sent = await database("sent_post_grad_applicants")
        .where({
          applicant_id: parent.applicant_id,
          scheme_id: parent.scheme_id,
        })
        .first();
      return sent;
    },
    async pre_admission_marks(parent) {
      // fetching applicant marks as well
      const marks = await database("post_grad_pre_admission_exams")
        .where({
          applicant_id: parent.applicant_id,
          scheme_id: parent.scheme_id,
        })
        .orderBy("id");
      return marks;
    },
    async admitted(parent) {
      const record = await database("admitted_students")
        .where({
          applicant_id: parent.applicant_id,
          scheme_id: parent.scheme_id,
        })
        .first();

      if (!record) return false;

      return true;
    },
  },
  User: {
    async biodata(parent) {
      return await tredumoDB("staff")
        .where({
          id: parent.user_id,
        })
        .first();
    },
    async last_logged_in(parent) {
      const lastLogin = await tredumoDB("management_user_logins")
        .where({
          user_id: parent.user_id,
        })
        .orderBy("id", "desc") // Assuming your table has an 'id' column, replace it with the appropriate column
        .limit(1)
        .offset(1);

      if (!lastLogin[0]) {
        return await tredumoDB("management_user_logins")
          .where({
            user_id: parent.user_id,
          })
          .orderBy("id", "desc") // Assuming your table has an 'id' column, replace it with the appropriate column
          .limit(1);
      }

      return lastLogin;
    },
  },
  ApplicationSent: {
    async program(parent) {
      return await database("postgraduate_courses")
        .where({
          id: parent.program_id,
        })
        .first();
    },
  },
  Mutation: {
    async addUser(parent, args) {
      const salt = await bcrypt.genSalt();
      const sysGenPwd = generateRandomString();

      const hashedPwd = await bcrypt.hash(sysGenPwd, salt);

      // console.log("hash", hashedPwd);

      // save to the db
      const userInserted = await tredumoDB("management_users").insert({
        user_id: args.user_id,
        email: args.email,
        pwd: hashedPwd,
        created_by: args.created_by,
        sys_gen_pwd: 1, //true
      });

      // get the user
      const user = await tredumoDB("management_users")
        .where({
          id: userInserted[0],
        })
        .first();

      // console.log("user", user);

      return { ...user, pwd: sysGenPwd };
    },
    async login(parent, args, context) {
      const user = await tredumoDB("management_users")
        .where({
          email: args.email,
        })
        .first();

      if (user) {
        const auth = await bcrypt.compare(args.pwd, user.pwd);

        // console.log(auth);
        if (auth) {
          // Access the IP address from the context
          const clientIpAddress = context.req.connection.remoteAddress;

          // console.log(clientIpAddress);
          // store the login data
          await tredumoDB("management_user_logins").insert({
            user_id: user.user_id,
            machine_ipaddress: clientIpAddress,
          });

          return user;
        } else {
          throw new GraphQLError("Incorrect Password");
        }
      } else {
        throw new GraphQLError("Invalid Email");
      }
    },
    async change_password(parent, args) {
      const salt = await bcrypt.genSalt();
      // const sysGenPwd = generateRandomString();

      const hashedPwd = await bcrypt.hash(args.password, salt);

      // console.log("hash", hashedPwd);

      // save to the db
      const pwdUpdated = await tredumoDB("management_users")
        .update({
          pwd: hashedPwd,
          sys_gen_pwd: 0, //true
        })
        .where({
          id: args.id,
        });

      // get the user
      const user = await tredumoDB("management_users")
        .where({
          id: args.id,
        })
        .first();

      // console.log("user", user);

      return user;
    },
    async save_sent_phd_stds(parent, args) {
      // insert data in db
      const fieldsToInsert = args.stds.map((std) => ({
        applicant_id: std.applicantId,
        scheme_id: std.schemeId,
        program_id: std.program_id,
        sent_by: args.sent_by,
      }));

      // console.log("received data ", fieldsToInsert);
      const insert = await database("sent_post_grad_applicants").insert(
        fieldsToInsert
      );

      // supposed to return full details of the forms
      // console.log("insert ids", insert);
      return {
        message: "Data saved successfully",
      };
    },
    async admit_students(parent, args) {
      let insertedIds = [];
      let lastAdmitRecord;

      console.log("the args", args);

      if (args.stds.length > 0) {
        try {
          for (const std of args.stds) {
            const stdExists = await database("admitted_students")
              .where({
                applicant_id: std.applicantId,
                scheme_id: std.schemeId,
                program_id: std.program_id,
              })
              .first();

            // Wait for the orderBy and first queries to complete
            lastAdmitRecord = await database("admitted_students")
              .orderBy("id", "desc")
              .first();

            // console.log("last stdno", lastAdmitRecord);

            let lastStdno = "";

            if (lastAdmitRecord !== undefined) {
              lastStdno = lastAdmitRecord.stdno;
            } else if (!stdExists) {
              // If the table is empty and the student doesn't exist, generate initial stdno
              lastStdno = "";
            }

            const stdno = getNextStdNumber(lastStdno);

            // console.log("generated stdnos", stdno);

            if (!stdExists) {
              const insert = await database("admitted_students").insert({
                applicant_id: std.applicantId,
                scheme_id: std.schemeId,
                program_id: std.program_id,
                stdno,
                admitted_by: args.admitted_by,
              });

              insertedIds.push(insert[0]);
            }

            // populate the data to 3 tables in the postgraaduate db
            // the users table

            // first lets get the biodata from the admissions module
            const stdBio = await database("admission-users")
              .join(
                "admitted_students",
                "admission-users.id",
                "admitted_students.applicant_id"
              )
              .where("admission-users.id", "=", std.applicantId)
              .andWhere("admitted_students.scheme_id", "=", std.schemeId)
              .first();

            // then, lets check if the student email or stdno already exists in the db
            const postgradUsers = await postgraduateDB("_users").where(
              (builder) =>
                builder
                  .where("email", stdBio.email)
                  .orWhere("email", stdBio.stdno)
            );

            // console.log("bio data", stdBio)

            if (postgradUsers.length === 0) {
              // no existing email or stdno
              // now lets insert the students in the users table of the post grad db
              const salt = await bcrypt.genSalt();
              // const sysGenPwd = generateRandomString();

              const hashedPwd = await bcrypt.hash(stdBio.stdno, salt);
              const fieldsToInsert = {
                first_name: stdBio.surname,
                last_name: stdBio.other_names,
                user_type: "staff",
                is_admin: 0,
                role_id: 2,
                email: stdBio.stdno,
                password: hashedPwd,
                status: "active",
                job_title: "Student",
                language: "",
              };

              await postgraduateDB.transaction(async (trx) => {
                const insertedBio = await trx("_users").insert(fieldsToInsert);

                // after insert users, lets now insert into these stds table
                const insertedStdBio = await trx("_std_biodata").insert({
                  user_id: insertedBio[0],
                  name: stdBio.surname + " " + stdBio.other_names,
                  stdno: stdBio.stdno,
                  email: stdBio.email,
                  phone_no: stdBio.phone_no,
                  program_id: std.program_id,
                });

                const currentDate = new Date();
                const deadlineDate = new Date();
                deadlineDate.setFullYear(currentDate.getFullYear() + 5);

                // now lets also insert data in the projects table
                const insertedProject = await trx(" _projects").insert({
                  title: stdBio.surname + " " + stdBio.other_names,
                  description: stdBio.surname + " " + stdBio.other_names,
                  project_type: "internal_project",
                  start_date: new Date(),
                  deadline: deadlineDate, // five years from now
                  client_id: 1,
                  created_date: new Date(),
                  created_by: args.admitted_by,
                  status: "open",
                  std_id: insertedBio[0],
                });

                // now, lets add the student to the project_members_table
                await trx(" _project_members").insert({
                  user_id: insertedBio[0],
                  project_id: insertedProject[0],
                  is_leader: 1,
                });
              });
            }
          }
          return {
            message: "Students admitted successfully",
          };
        } catch (error) {
          console.log("an error occurred", error);
        }
      } else {
        return {
          message: "No student was received",
        };
      }
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  context: ({ req }) => ({ req }),
  listen: { port: port },
});

console.log(`App running on port ${port}`);
